from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_plannertask'),
        ('accounts', '0003_add_teacher_role_preferences_gamification'),
    ]

    operations = [
        migrations.CreateModel(
            name='YouTubeResource',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('youtube_id', models.CharField(max_length=20)),
                ('title', models.CharField(max_length=500)),
                ('thumbnail', models.URLField()),
                ('channel', models.CharField(blank=True, max_length=200)),
                ('duration', models.CharField(blank=True, max_length=20)),
                ('view_count', models.BigIntegerField(default=0)),
                ('url', models.URLField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('added_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.user')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='youtube_resources', to='courses.subject')),
            ],
            options={
                'db_table': 'youtube_resources',
                'ordering': ['-created_at'],
                'unique_together': {('subject', 'youtube_id')},
            },
        ),
    ]
