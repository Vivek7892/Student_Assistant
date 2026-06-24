import uuid
from django.db import models
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
    file_url = models.URLField()
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    file_type = models.CharField(max_length=20)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_materials')
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
