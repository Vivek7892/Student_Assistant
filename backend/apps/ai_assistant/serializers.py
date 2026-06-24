from rest_framework import serializers
from .models import ChatSession, ChatMessage, Quiz, QuizAttempt, Flashcard, StudyPlan


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'sources', 'tokens_used', 'created_at']
        read_only_fields = ['id', 'created_at', 'tokens_used', 'sources']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'subject', 'title', 'is_active', 'created_at', 'updated_at', 'messages', 'last_message', 'message_count']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        return ChatMessageSerializer(msg).data if msg else None

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatSessionListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'subject', 'title', 'is_active', 'created_at', 'updated_at', 'last_message', 'message_count']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        return ChatMessageSerializer(msg).data if msg else None

    def get_message_count(self, obj):
        return obj.messages.count()


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField()
    session_id = serializers.UUIDField(required=False)
    subject_id = serializers.UUIDField(required=False)
    material_id = serializers.UUIDField(required=False)
    language = serializers.ChoiceField(choices=['english', 'kannada'], default='english')


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


class GenerateQuizSerializer(serializers.Serializer):
    material_id = serializers.UUIDField()
    num_questions = serializers.IntegerField(default=10, min_value=5, max_value=30)
    difficulty = serializers.ChoiceField(choices=['easy', 'medium', 'hard'], default='medium')
    title = serializers.CharField(required=False)


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
