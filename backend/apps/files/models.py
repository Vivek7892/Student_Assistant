import uuid
from django.db import models
from apps.accounts.models import User
from apps.courses.models import Subject, Semester


class UploadedFile(models.Model):
    class FileCategory(models.TextChoices):
        STUDY_MATERIAL = 'study_material', 'Study Material'
        ASSIGNMENT = 'assignment', 'Assignment'
        SUBMISSION = 'submission', 'Submission'
        PROFILE = 'profile', 'Profile'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
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
