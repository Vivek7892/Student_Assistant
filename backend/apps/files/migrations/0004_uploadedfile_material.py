# Generated for adding the StudyMaterial link to uploaded file rows.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0008_plannertask_google_calendar_sync'),
        ('files', '0003_googledrivetoken_drive_folder_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='uploadedfile',
            name='material',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='uploaded_files',
                to='courses.studymaterial',
            ),
        ),
    ]
