"""
core/activity.py — central activity recorder.
Call record_activity(user, action) from any view/signal.
Actions: 'ai_session', 'quiz_attempt', 'flashcard_review', 'document_upload'
"""
import datetime
from django.utils import timezone
from django.db import transaction


ACTION_FIELD_MAP = {
    'ai_session':       'ai_sessions',
    'quiz_attempt':     'quiz_attempts',
    'flashcard_review': 'flashcard_reviews',
    'document_upload':  'documents_uploaded',
}

STUDY_MINUTES_MAP = {
    'ai_session':       15,
    'quiz_attempt':     20,
    'flashcard_review': 10,
    'document_upload':  5,
}


def record_activity(user, action: str):
    """
    Upsert DailyActivity for today, increment the relevant counter,
    then update the user's streak on StudentProfile.
    Thread-safe via select_for_update.
    """
    from apps.analytics.models import DailyActivity

    field = ACTION_FIELD_MAP.get(action)
    if not field:
        return

    today = timezone.now().date()

    with transaction.atomic():
        obj, _ = DailyActivity.objects.select_for_update().get_or_create(
            user=user, date=today,
            defaults={field: 0, 'study_minutes': 0}
        )
        setattr(obj, field, getattr(obj, field) + 1)
        obj.study_minutes += STUDY_MINUTES_MAP.get(action, 0)
        obj.save(update_fields=[field, 'study_minutes'])

    _update_streak(user, today)


def _update_streak(user, today: datetime.date):
    """Update streak on StudentProfile without resetting if already updated today."""
    profile = getattr(user, 'student_profile', None)
    if not profile:
        return

    last = profile.last_study_date
    if last == today:
        return  # already counted today

    with transaction.atomic():
        # Re-fetch inside transaction to avoid race
        from apps.accounts.models import StudentProfile
        profile = StudentProfile.objects.select_for_update().get(user=user)
        last = profile.last_study_date

        if last == today:
            return

        yesterday = today - datetime.timedelta(days=1)
        if last == yesterday:
            profile.streak += 1
        else:
            profile.streak = 1

        profile.last_study_date = today
        # XP: 10 per day + bonus at milestones
        xp_gain = 10
        if profile.streak in (7, 14, 30, 60, 100):
            xp_gain += 50 if profile.streak >= 30 else 25
        profile.xp += xp_gain
        profile.level = max(1, profile.xp // 100 + 1)
        profile.save(update_fields=['streak', 'last_study_date', 'xp', 'level'])

        # Streak milestone notification
        if profile.streak in (3, 7, 14, 30, 60, 100):
            try:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    user=user,
                    title=f'🔥 {profile.streak}-day streak!',
                    message=f'You\'ve studied {profile.streak} days in a row. Keep it up!',
                    notification_type='success',
                )
            except Exception:
                pass
