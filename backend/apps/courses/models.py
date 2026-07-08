import uuid
from django.db import models
from django.utils import timezone
from apps.accounts.models import User


class Semester(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    number = models.PositiveIntegerField()
    department = models.CharField(max_length=100)
    academic_year = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_semesters')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'semesters'
        ordering = ['number']
        unique_together = ['number', 'department', 'academic_year']

    def __str__(self):
        return f'Semester {self.number} - {self.department}'


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    credits = models.PositiveIntegerField(default=3)
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='teaching_subjects'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subjects'
        ordering = ['name']
        unique_together = ['semester', 'code']

    def __str__(self):
        return f'{self.code} - {self.name}'


class StudyMaterial(models.Model):
    class MaterialType(models.TextChoices):
        NOTES = 'notes', 'Notes'
        ASSIGNMENT = 'assignment', 'Assignment'
        PYQ = 'pyq', 'Previous Year Questions'
        REFERENCE = 'reference', 'Reference Material'
        SYLLABUS = 'syllabus', 'Syllabus'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='materials', null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    material_type = models.CharField(max_length=20, choices=MaterialType.choices, default=MaterialType.NOTES)
    file_url = models.URLField(max_length=1000)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=20)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_materials')
    drive_file_id = models.CharField(max_length=100, blank=True, null=True)  # Google Drive file ID
    is_processed = models.BooleanField(default=False)
    vector_collection_id = models.CharField(max_length=255, blank=True, null=True)
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_materials'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.subject.code if self.subject else "no subject"})'


class StudentSemesterEnrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='semester_enrollments')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'student_semester_enrollments'
        unique_together = ['student', 'semester']


class LearningResource(models.Model):
    class ResourceType(models.TextChoices):
        VIDEO = 'video', 'Video'
        ARTICLE = 'article', 'Article'
        LINK = 'link', 'External Link'
        BOOK = 'book', 'Book'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=200)
    url = models.URLField()
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices)
    description = models.TextField(blank=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'learning_resources'


class VideoFolder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_folders')
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='primary')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'video_folders'
        ordering = ['name']

    def __str__(self):
        return self.name


class YouTubeResource(models.Model):
    class Status(models.TextChoices):
        SAVED = 'saved', 'Saved'
        WATCHING = 'watching', 'Watching'
        COMPLETED = 'completed', 'Completed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='youtube_resources')
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    folder = models.ForeignKey(VideoFolder, on_delete=models.SET_NULL, null=True, blank=True, related_name='videos')
    youtube_id = models.CharField(max_length=20)
    title = models.CharField(max_length=500)
    thumbnail = models.URLField()
    channel = models.CharField(max_length=200, blank=True)
    duration = models.CharField(max_length=20, blank=True)
    view_count = models.BigIntegerField(default=0)
    url = models.URLField()
    notes = models.TextField(blank=True, default='')
    tags = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SAVED)
    is_favorite = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'youtube_resources'
        ordering = ['-created_at']
        unique_together = ['subject', 'youtube_id']

    def __str__(self):
        return self.title


class PlannerTask(models.Model):
    class DayChoice(models.TextChoices):
        MON = 'Mon', 'Monday'
        TUE = 'Tue', 'Tuesday'
        WED = 'Wed', 'Wednesday'
        THU = 'Thu', 'Thursday'
        FRI = 'Fri', 'Friday'
        SAT = 'Sat', 'Saturday'
        SUN = 'Sun', 'Sunday'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='planner_tasks')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='planner_tasks')
    title = models.CharField(max_length=200)
    subject_label = models.CharField(max_length=50, blank=True)  # display label
    day = models.CharField(max_length=3, choices=DayChoice.choices)
    start_hour = models.PositiveIntegerField()  # 8-19
    duration = models.PositiveIntegerField(default=1)  # hours
    color = models.CharField(max_length=20, default='primary')
    done = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    google_calendar_url = models.URLField(blank=True, default='', max_length=1000)
    google_event_id = models.CharField(max_length=255, blank=True, default='')
    google_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'planner_tasks'
        ordering = ['day', 'start_hour']
        indexes = [
            models.Index(fields=['user', 'day', 'start_hour'], name='planner_user_day_hour'),
            models.Index(fields=['user', 'google_synced_at'], name='planner_user_gcal_sync'),
        ]

    def mark_google_synced(self, calendar_url: str, event_id: str = ''):
        self.google_calendar_url = calendar_url
        self.google_event_id = event_id
        self.google_synced_at = timezone.now()
        self.save(update_fields=['google_calendar_url', 'google_event_id', 'google_synced_at', 'updated_at'])
