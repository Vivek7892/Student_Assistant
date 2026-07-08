from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0003_notes_goals_pomodoro_tokens'),
        ('courses', '0008_plannertask_google_calendar_sync'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subject_name', models.CharField(blank=True, default='', max_length=200)),
                ('title', models.CharField(blank=True, max_length=200)),
                ('client_token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('subject', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='courses.subject')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_chat_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'ai_chat_sessions',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('user', 'User'), ('assistant', 'Assistant'), ('system', 'System')], max_length=20)),
                ('content', models.TextField()),
                ('sources', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='ai_assistant.chatsession')),
            ],
            options={
                'db_table': 'ai_chat_messages',
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='chatsession',
            index=models.Index(fields=['user', 'updated_at'], name='chat_user_updated_sql'),
        ),
    ]
