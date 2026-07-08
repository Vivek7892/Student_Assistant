import uuid
from django.db import models
from apps.accounts.models import User
from apps.courses.models import Subject, Semester, StudyMaterial


class UploadedFile(models.Model):
    class FileCategory(models.TextChoices):
        STUDY_MATERIAL = 'study_material', 'Study Material'
        ASSIGNMENT = 'assignment', 'Assignment'
        SUBMISSION = 'submission', 'Submission'
        PROFILE = 'profile', 'Profile'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    material = models.ForeignKey(StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_files')
    semester = models.ForeignKey(Semester, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    original_name = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    public_url = models.URLField()
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100)
    category = models.CharField(max_length=30, choices=FileCategory.choices, default=FileCategory.OTHER)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'uploaded_files'
        ordering = ['-created_at']


class GoogleDriveToken(models.Model):
    """Stores per-user Google Drive OAuth2 tokens for Drive sync."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='drive_token')
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True)
    token_expiry = models.DateTimeField(null=True, blank=True)
    scope = models.TextField(blank=True)
    # ID of the 'Student_Assistant' folder created in user's Drive
    drive_folder_id = models.CharField(max_length=200, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_drive_tokens'

    def __str__(self):
        return f'DriveToken({self.user.email})'
