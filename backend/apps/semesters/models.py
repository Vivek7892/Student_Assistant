import uuid
from django.db import models
from apps.accounts.models import User


class Semester(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='semesters')
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    gpa_target = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'v2_semesters'
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.name} ({self.user.email})'


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20)
    color = models.CharField(max_length=7, default='#6366f1')
    credits = models.PositiveSmallIntegerField(default=3)
    instructor = models.CharField(max_length=200, blank=True)
    progress = models.PositiveSmallIntegerField(default=0)   # 0-100
    current_grade = models.CharField(max_length=5, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'v2_subjects'
        ordering = ['name']

    def __str__(self):
        return f'{self.code} - {self.name}'
