from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0005_studymaterial_drive_file_id'),
        ('accounts', '0003_add_teacher_role_preferences_gamification'),
    ]

    operations = [
        migrations.CreateModel(
            name='VideoFolder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('color', models.CharField(max_length=20, default='primary')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey('accounts.User', on_delete=django.db.models.deletion.CASCADE, related_name='video_folders')),
            ],
            options={'db_table': 'video_folders', 'ordering': ['name']},
        ),
        migrations.AddField(
            model_name='youtuberesource',
            name='folder',
            field=models.ForeignKey(
                'courses.VideoFolder',
                on_delete=django.db.models.deletion.SET_NULL,
                null=True, blank=True,
                related_name='videos',
            ),
        ),
        migrations.AddField(
            model_name='youtuberesource',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='youtuberesource',
            name='tags',
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.AddField(
            model_name='youtuberesource',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[('watching', 'Watching'), ('completed', 'Completed'), ('saved', 'Saved')],
                default='saved',
            ),
        ),
        migrations.AddField(
            model_name='youtuberesource',
            name='is_favorite',
            field=models.BooleanField(default=False),
        ),
    ]
