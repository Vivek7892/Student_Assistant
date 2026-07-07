import uuid
from django.db import models
from apps.accounts.models import User


class DailyActivity(models.Model):
    """One row per user per day — aggregates all study activity for heatmap/streaks."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_activities')
    date = models.DateField()
    ai_sessions = models.PositiveIntegerField(default=0)
    quiz_attempts = models.PositiveIntegerField(default=0)
    flashcard_reviews = models.PositiveIntegerField(default=0)
    documents_uploaded = models.PositiveIntegerField(default=0)
    study_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'daily_activities'
        unique_together = ['user', 'date']
        ordering = ['-date']

    @property
    def total_events(self):
        return self.ai_sessions + self.quiz_attempts + self.flashcard_reviews + self.documents_uploaded


class SubjectMastery(models.Model):
    """Tracks per-user per-subject mastery score (updated after each quiz attempt)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subject_masteries')
    subject = models.ForeignKey('courses.Subject', on_delete=models.CASCADE, related_name='masteries')
    avg_score = models.FloatField(default=0)
    attempts = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subject_masteries'
        unique_together = ['user', 'subject']
