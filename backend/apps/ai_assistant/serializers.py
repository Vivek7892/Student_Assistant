from rest_framework import serializers
from .models import Goal, PomodoroSession, Quiz, QuizAttempt, Flashcard, StudyNote, StudyPlan


class QuizSerializer(serializers.ModelSerializer):
    attempts_count = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by', 'is_ai_generated']

    def get_attempts_count(self, obj):
        return obj.attempts.count()


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = '__all__'
        read_only_fields = ['id', 'completed_at', 'student', 'score', 'total_questions']


class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by', 'is_ai_generated']


class StudyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'student']


class StudyNoteSerializer(serializers.ModelSerializer):
    token = serializers.UUIDField(source='client_token', read_only=True)

    class Meta:
        model = StudyNote
        fields = [
            'id', 'user', 'subject', 'title', 'subject_label', 'color', 'tags', 'content',
            'pinned', 'favorite', 'token', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'token', 'created_at', 'updated_at']


class GoalSerializer(serializers.ModelSerializer):
    token = serializers.UUIDField(source='client_token', read_only=True)

    class Meta:
        model = Goal
        fields = [
            'id', 'user', 'title', 'target', 'current', 'unit', 'deadline',
            'linked_activity', 'token', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'token', 'created_at', 'updated_at']


class PomodoroSessionSerializer(serializers.ModelSerializer):
    token = serializers.UUIDField(source='client_token', read_only=True)

    class Meta:
        model = PomodoroSession
        fields = ['id', 'user', 'subject_label', 'minutes', 'token', 'completed_at']
        read_only_fields = ['id', 'user', 'token', 'completed_at']


class GenerateQuizSerializer(serializers.Serializer):
    material_id = serializers.UUIDField()
    num_questions = serializers.IntegerField(default=5, min_value=1, max_value=30)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'], default='medium')
    title = serializers.CharField(required=False, allow_blank=True)


class GenerateFlashcardsSerializer(serializers.Serializer):
    material_id = serializers.UUIDField()
    num_cards = serializers.IntegerField(default=15, min_value=5, max_value=50)
    title = serializers.CharField(required=False)


class SummarizeSerializer(serializers.Serializer):
    material_id = serializers.UUIDField()


class StudyPlanRequestSerializer(serializers.Serializer):
    subject_ids = serializers.ListField(child=serializers.UUIDField())
    duration_days = serializers.IntegerField(min_value=7, max_value=90)
    exam_date = serializers.DateField()
    title = serializers.CharField(required=False)
