from django.db import migrations, models
from django.utils import timezone


def backfill_updated_at(apps, schema_editor):
    PlannerTask = apps.get_model('courses', 'PlannerTask')
    PlannerTask.objects.filter(updated_at__isnull=True).update(updated_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0007_add_daily_activity_subject_mastery'),
    ]

    operations = [
        migrations.AddField(
            model_name='plannertask',
            name='google_calendar_url',
            field=models.URLField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='plannertask',
            name='google_event_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='plannertask',
            name='google_synced_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='plannertask',
            name='updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_updated_at, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='plannertask',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddIndex(
            model_name='plannertask',
            index=models.Index(fields=['user', 'day', 'start_hour'], name='planner_user_day_hour'),
        ),
        migrations.AddIndex(
            model_name='plannertask',
            index=models.Index(fields=['user', 'google_synced_at'], name='planner_user_gcal_sync'),
        ),
    ]
