import logging
import requests
import tempfile
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChatSession, ChatMessage, Quiz, QuizAttempt, Flashcard, StudyPlan, AIUsageLog
from .serializers import (
    ChatSessionSerializer, ChatSessionListSerializer, ChatMessageSerializer,
    ChatRequestSerializer, QuizSerializer, QuizAttemptSerializer,
    FlashcardSerializer, StudyPlanSerializer,
    GenerateQuizSerializer, GenerateFlashcardsSerializer,
    SummarizeSerializer, StudyPlanRequestSerializer,
)
from apps.courses.models import StudyMaterial, Subject

logger = logging.getLogger(__name__)


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        return ChatSession.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return ChatSessionListSerializer
        return ChatSessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def chat(self, request):
        from .rag import rag_pipeline
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session_id = data.get('session_id')
        if session_id:
            session = ChatSession.objects.filter(id=session_id, user=request.user).first()
            if not session:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            subject = None
            if data.get('subject_id'):
                subject = Subject.objects.filter(id=data['subject_id']).first()
            session = ChatSession.objects.create(
                user=request.user,
                subject=subject,
                title=data['message'][:50],
            )

        user_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=data['message'],
        )

        history = []
        past_messages = session.messages.exclude(id=user_message.id).order_by('created_at')[:20]
        for i in range(0, len(past_messages) - 1, 2):
            if past_messages[i].role == 'user' and past_messages[i + 1].role == 'assistant':
                history.append((past_messages[i].content, past_messages[i + 1].content))

        try:
            from django.conf import settings as django_settings
            if not django_settings.OPENAI_API_KEY:
                raise ValueError('OpenAI API key not configured')

            material_id = data.get('material_id')
            if material_id:
                material = StudyMaterial.objects.get(id=material_id, is_processed=True)
                collection_name = material.vector_collection_id
            elif session.subject:
                collection_name = f'subject_{session.subject.id}'
            else:
                collection_name = f'user_{request.user.id}'

            result = rag_pipeline.query(
                question=data['message'],
                collection_name=collection_name,
                chat_history=history,
                language=data.get('language', 'english'),
            )
            answer = result['answer']
            sources = result['sources']
        except ValueError as e:
            answer = str(e) + '. Please add your OPENAI_API_KEY to the .env file to enable AI responses.'
            sources = []
        except Exception as e:
            logger.error(f'RAG error: {e}')
            answer = 'I am unable to process your request right now. Please ensure study materials are uploaded and processed, and that the OpenAI API key is configured.'
            sources = []

        assistant_message = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=answer,
            sources=sources,
        )

        session.updated_at = timezone.now()
        session.save(update_fields=['updated_at'])

        AIUsageLog.objects.create(user=request.user, action='chat', metadata={'session_id': str(session.id)})

        return Response({
            'session_id': str(session.id),
            'user_message': ChatMessageSerializer(user_message).data,
            'assistant_message': ChatMessageSerializer(assistant_message).data,
        })


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    filterset_fields = ['subject', 'difficulty', 'is_published']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Quiz.objects.filter(subject__semester__enrollments__student=user, is_published=True)
        return Quiz.objects.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_ai_generated=False)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from .rag import rag_pipeline, doc_processor
        serializer = GenerateQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            material = StudyMaterial.objects.get(id=data['material_id'])
            response = requests.get(material.file_url, timeout=60)
            ext = f'.{material.file_type.lower()}'
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
            text = doc_processor.extract_text(tmp_path)

            questions = rag_pipeline.generate_quiz(text, data['num_questions'], data['difficulty'])
            quiz = Quiz.objects.create(
                subject=material.subject,
                material=material,
                created_by=request.user,
                title=data.get('title', f'Quiz - {material.title}'),
                difficulty=data['difficulty'],
                questions=questions,
                is_ai_generated=True,
            )
            AIUsageLog.objects.create(user=request.user, action='generate_quiz')
            return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        answers = request.data.get('answers', [])
        correct = sum(
            1 for q, a in zip(quiz.questions, answers)
            if q.get('correct_answer') == a.get('selected')
        )
        score = (correct / len(quiz.questions)) * 100 if quiz.questions else 0
        attempt = QuizAttempt.objects.create(
            quiz=quiz, student=request.user,
            answers=answers, score=score,
            total_questions=len(quiz.questions),
            time_taken_seconds=request.data.get('time_taken_seconds', 0),
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class FlashcardViewSet(viewsets.ModelViewSet):
    serializer_class = FlashcardSerializer
    filterset_fields = ['subject']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Flashcard.objects.filter(subject__semester__enrollments__student=user)
        return Flashcard.objects.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_ai_generated=False)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from .rag import rag_pipeline, doc_processor
        serializer = GenerateFlashcardsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            material = StudyMaterial.objects.get(id=data['material_id'])
            response = requests.get(material.file_url, timeout=60)
            ext = f'.{material.file_type.lower()}'
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
            text = doc_processor.extract_text(tmp_path)

            cards = rag_pipeline.generate_flashcards(text, data['num_cards'])
            flashcard = Flashcard.objects.create(
                subject=material.subject,
                material=material,
                created_by=request.user,
                title=data.get('title', f'Flashcards - {material.title}'),
                cards=cards,
                is_ai_generated=True,
            )
            AIUsageLog.objects.create(user=request.user, action='generate_flashcards')
            return Response(FlashcardSerializer(flashcard).data, status=status.HTTP_201_CREATED)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer

    def get_queryset(self):
        return StudyPlan.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from .rag import rag_pipeline
        serializer = StudyPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subjects = Subject.objects.filter(id__in=data['subject_ids'])
        subject_names = [s.name for s in subjects]

        plan_data = rag_pipeline.generate_study_plan(
            subjects=subject_names,
            duration_days=data['duration_days'],
            exam_date=str(data['exam_date']),
        )

        study_plan = StudyPlan.objects.create(
            student=request.user,
            title=data.get('title', f'Study Plan - {data["exam_date"]}'),
            plan_data=plan_data,
            start_date=data['exam_date'],
            end_date=data['exam_date'],
        )
        AIUsageLog.objects.create(user=request.user, action='generate_study_plan')
        return Response(StudyPlanSerializer(study_plan).data, status=status.HTTP_201_CREATED)


class SummarizeView(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def summarize(self, request):
        from .rag import rag_pipeline, doc_processor
        serializer = SummarizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            material = StudyMaterial.objects.get(id=serializer.validated_data['material_id'])
            response = requests.get(material.file_url, timeout=60)
            ext = f'.{material.file_type.lower()}'
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
            text = doc_processor.extract_text(tmp_path)
            summary = rag_pipeline.summarize(text)
            AIUsageLog.objects.create(user=request.user, action='summarize')
            return Response({'summary': summary})
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)
