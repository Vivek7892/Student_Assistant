import uuid
from django.conf import settings
from django.db import models


class SavedVideo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_videos')
    url = models.URLField(max_length=500)
    video_id = models.CharField(max_length=20)
    title = models.CharField(max_length=500)
    thumbnail = models.URLField(max_length=500, blank=True)
    channel = models.CharField(max_length=255, blank=True)
    duration = models.PositiveIntegerField(default=0)
    duration_fmt = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    folder = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=30, default='watching')
    favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saved_videos'
        ordering = ['-created_at']
        unique_together = ['user', 'video_id']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='saved_video_user_created'),
            models.Index(fields=['user', 'folder'], name='saved_video_user_folder'),
            models.Index(fields=['user', 'favorite'], name='saved_video_user_fav'),
            models.Index(fields=['user', 'status'], name='saved_video_user_status'),
        ]

    def __str__(self):
        return self.title
