import uuid
from django.db import models
from apps.accounts.models import User
from apps.courses.models import Subject, StudyMaterial

class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_chat_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    subject_name = models.CharField(max_length=200, blank=True, default='')
    title = models.CharField(max_length=200, blank=True)
    client_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ai_chat_sessions'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'updated_at'], name='chat_user_updated_sql'),
        ]


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    sources = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_chat_messages'
        ordering = ['created_at']


class Quiz(models.Model):
    class DifficultyLevel(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='quizzes')
    material = models.ForeignKey(StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=DifficultyLevel.choices, default=DifficultyLevel.MEDIUM)
    questions = models.JSONField(default=list)
    time_limit_minutes = models.PositiveIntegerField(default=30)
    is_ai_generated = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quizzes'
        ordering = ['-created_at']


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    answers = models.JSONField(default=list)
    score = models.FloatField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-completed_at']


class Flashcard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='flashcards')
    material = models.ForeignKey(StudyMaterial, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=200)
    cards = models.JSONField(default=list)
    is_ai_generated = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'flashcards'
        ordering = ['-created_at']


class StudyPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_plans')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=200)
    plan_data = models.JSONField(default=dict)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'study_plans'
        ordering = ['-created_at']


class StudyNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_notes')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='study_notes')
    title = models.CharField(max_length=200)
    subject_label = models.CharField(max_length=100, blank=True, default='General')
    color = models.CharField(max_length=20, default='primary')
    tags = models.JSONField(default=list, blank=True)
    content = models.TextField(blank=True)
    pinned = models.BooleanField(default=False)
    favorite = models.BooleanField(default=False)
    client_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'study_notes'
        ordering = ['-pinned', '-updated_at']
        indexes = [
            models.Index(fields=['user', 'updated_at'], name='notes_user_updated'),
        ]


class Goal(models.Model):
    class LinkedActivity(models.TextChoices):
        FOCUS = 'focus', 'Focus'
        QUIZ = 'quiz', 'Quiz'
        FLASHCARDS = 'flashcards', 'Flashcards'
        DOCUMENTS = 'documents', 'Documents'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=200)
    target = models.FloatField(default=1)
    current = models.FloatField(default=0)
    unit = models.CharField(max_length=50, default='hours')
    deadline = models.DateField()
    linked_activity = models.CharField(max_length=20, choices=LinkedActivity.choices, blank=True, default='')
    client_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'goals'
        ordering = ['deadline', '-created_at']
        indexes = [
            models.Index(fields=['user', 'deadline'], name='goals_user_deadline'),
        ]


class PomodoroSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pomodoro_sessions')
    subject_label = models.CharField(max_length=100, blank=True, default='General')
    minutes = models.PositiveIntegerField(default=25)
    client_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pomodoro_sessions'
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['user', 'completed_at'], name='pomodoro_user_completed'),
        ]


class AIUsageLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    tokens_used = models.PositiveIntegerField(default=0)
    model_used = models.CharField(max_length=50, default='gemini-2.0-flash-lite')
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_usage_logs'
        ordering = ['-created_at']
