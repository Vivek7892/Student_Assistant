from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0002_remove_chat_models'),
        ('courses', '0008_plannertask_google_calendar_sync'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Goal',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('target', models.FloatField(default=1)),
                ('current', models.FloatField(default=0)),
                ('unit', models.CharField(default='hours', max_length=50)),
                ('deadline', models.DateField()),
                ('linked_activity', models.CharField(blank=True, choices=[('focus', 'Focus'), ('quiz', 'Quiz'), ('flashcards', 'Flashcards'), ('documents', 'Documents')], default='', max_length=20)),
                ('client_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='goals', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'goals',
                'ordering': ['deadline', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PomodoroSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subject_label', models.CharField(blank=True, default='General', max_length=100)),
                ('minutes', models.PositiveIntegerField(default=25)),
                ('client_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('completed_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pomodoro_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'pomodoro_sessions',
                'ordering': ['-completed_at'],
            },
        ),
        migrations.CreateModel(
            name='StudyNote',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('subject_label', models.CharField(blank=True, default='General', max_length=100)),
                ('color', models.CharField(default='primary', max_length=20)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('content', models.TextField(blank=True)),
                ('pinned', models.BooleanField(default=False)),
                ('favorite', models.BooleanField(default=False)),
                ('client_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('subject', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='study_notes', to='courses.subject')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='study_notes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'study_notes',
                'ordering': ['-pinned', '-updated_at'],
            },
        ),
        migrations.AlterField(
            model_name='aiusagelog',
            name='model_used',
            field=models.CharField(default='gemini-2.0-flash-lite', max_length=50),
        ),
        migrations.AddIndex(
            model_name='goal',
            index=models.Index(fields=['user', 'deadline'], name='goals_user_deadline'),
        ),
        migrations.AddIndex(
            model_name='pomodorosession',
            index=models.Index(fields=['user', 'completed_at'], name='pomodoro_user_completed'),
        ),
        migrations.AddIndex(
            model_name='studynote',
            index=models.Index(fields=['user', 'updated_at'], name='notes_user_updated'),
        ),
    ]
