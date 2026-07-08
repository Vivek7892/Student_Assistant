# Generated for normalizing Cloudinary URLs and linking uploaded files to StudyMaterial rows.

from django.db import migrations


def backfill_material_links(apps, schema_editor):
    UploadedFile = apps.get_model('files', 'UploadedFile')
    StudyMaterial = apps.get_model('courses', 'StudyMaterial')

    for material in StudyMaterial.objects.filter(file_url__contains='fl_attachment:false,fl_inline').iterator():
        material.file_url = material.file_url.replace('fl_attachment:false,fl_inline/', 'fl_inline/')
        material.save(update_fields=['file_url'])

    for uploaded in UploadedFile.objects.filter(public_url__contains='fl_attachment:false,fl_inline').iterator():
        uploaded.public_url = uploaded.public_url.replace('fl_attachment:false,fl_inline/', 'fl_inline/')
        uploaded.save(update_fields=['public_url'])

    for uploaded in UploadedFile.objects.filter(material__isnull=True, category='study_material').iterator():
        material = StudyMaterial.objects.filter(
            uploaded_by_id=uploaded.uploaded_by_id,
            file_url=uploaded.public_url,
        ).order_by('-created_at').first()
        if material:
            uploaded.material_id = material.id
            uploaded.save(update_fields=['material'])


def clear_material_links(apps, schema_editor):
    UploadedFile = apps.get_model('files', 'UploadedFile')
    UploadedFile.objects.update(material=None)


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0004_uploadedfile_material'),
    ]

    operations = [
        migrations.RunPython(backfill_material_links, clear_material_links),
    ]
