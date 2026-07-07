from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_remove_teacher'),
    ]

    operations = [
        # Add TEACHER to role choices (data already in DB from 0001)
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('student', 'Student'), ('teacher', 'Teacher'), ('admin', 'Admin')],
                default='student',
                max_length=20,
            ),
        ),
        # Gamification fields on StudentProfile
        migrations.AddField(
            model_name='studentprofile',
            name='university',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='major',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='gpa',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='xp',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='level',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='streak',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='last_study_date',
            field=models.DateField(blank=True, null=True),
        ),
        # TeacherProfile (re-create — was removed in 0002)
        migrations.CreateModel(
            name='TeacherProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department', models.CharField(blank=True, max_length=100)),
                ('qualification', models.CharField(blank=True, max_length=200)),
                ('experience_years', models.PositiveIntegerField(default=0)),
                ('subjects_handled', models.JSONField(blank=True, default=list)),
                ('bio', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='teacher_profile',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'teacher_profiles'},
        ),
        # UserPreferences
        migrations.CreateModel(
            name='UserPreferences',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dark_mode', models.BooleanField(default=False)),
                ('notify_deadlines', models.BooleanField(default=True)),
                ('notify_streaks', models.BooleanField(default=True)),
                ('notify_grades', models.BooleanField(default=True)),
                ('notify_ai', models.BooleanField(default=False)),
                ('ai_contextual', models.BooleanField(default=True)),
                ('ai_suggestions', models.BooleanField(default=True)),
                ('ai_auto_summarize', models.BooleanField(default=False)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='preferences',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'user_preferences'},
        ),
    ]
