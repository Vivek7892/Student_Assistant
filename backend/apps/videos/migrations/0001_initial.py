import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SavedVideo',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('url', models.URLField(max_length=500)),
                ('video_id', models.CharField(max_length=20)),
                ('title', models.CharField(max_length=500)),
                ('thumbnail', models.URLField(blank=True, max_length=500)),
                ('channel', models.CharField(blank=True, max_length=255)),
                ('duration', models.PositiveIntegerField(default=0)),
                ('duration_fmt', models.CharField(blank=True, max_length=20)),
                ('description', models.TextField(blank=True)),
                ('folder', models.CharField(blank=True, max_length=120)),
                ('notes', models.TextField(blank=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(default='watching', max_length=30)),
                ('favorite', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saved_videos', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'saved_videos',
                'ordering': ['-created_at'],
                'unique_together': {('user', 'video_id')},
            },
        ),
        migrations.AddIndex(
            model_name='savedvideo',
            index=models.Index(fields=['user', '-created_at'], name='saved_video_user_created'),
        ),
        migrations.AddIndex(
            model_name='savedvideo',
            index=models.Index(fields=['user', 'folder'], name='saved_video_user_folder'),
        ),
        migrations.AddIndex(
            model_name='savedvideo',
            index=models.Index(fields=['user', 'favorite'], name='saved_video_user_fav'),
        ),
        migrations.AddIndex(
            model_name='savedvideo',
            index=models.Index(fields=['user', 'status'], name='saved_video_user_status'),
        ),
    ]
