from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0002_googledrivetoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='googledrivetoken',
            name='drive_folder_id',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
