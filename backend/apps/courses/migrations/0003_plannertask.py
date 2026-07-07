from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_alter_studymaterial_subject'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlannerTask',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('subject_label', models.CharField(blank=True, max_length=50)),
                ('day', models.CharField(
                    choices=[
                        ('Mon', 'Monday'), ('Tue', 'Tuesday'), ('Wed', 'Wednesday'),
                        ('Thu', 'Thursday'), ('Fri', 'Friday'), ('Sat', 'Saturday'), ('Sun', 'Sunday'),
                    ],
                    max_length=3,
                )),
                ('start_hour', models.PositiveIntegerField()),
                ('duration', models.PositiveIntegerField(default=1)),
                ('color', models.CharField(default='primary', max_length=20)),
                ('done', models.BooleanField(default=False)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('subject', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='planner_tasks',
                    to='courses.subject',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planner_tasks',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'db_table': 'planner_tasks', 'ordering': ['day', 'start_hour']},
        ),
    ]
