import uuid
import logging
from datetime import datetime, timezone as dt_tz
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Quiz, QuizAttempt, Flashcard, StudyPlan, AIUsageLog
from .gemini_rag import gemini_rag, doc_processor
from .serializers import (
    QuizSerializer, QuizAttemptSerializer,
    FlashcardSerializer, StudyPlanSerializer,
    GenerateQuizSerializer, GenerateFlashcardsSerializer,
    SummarizeSerializer, StudyPlanRequestSerializer,
)
from apps.courses.models import StudyMaterial, Subject
from apps.accounts.permissions import IsOwnerOrAdmin
from core.mongo import get_collection

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(dt_tz.utc)


def _assert_material_access(material_id, user):
    """Return material if it exists and user is authenticated."""
    try:
        mat = StudyMaterial.objects.get(id=material_id)
    except StudyMaterial.DoesNotExist:
        return None, Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)
    return mat, None


def _read_material_text(mat) -> str:
    """Read text from a StudyMaterial — tries local file first, falls back to URL download."""
    import os, tempfile, requests as req
    from pathlib import Path

    # Try local file path first (avoids HTTP round-trip for local media)
    media_root = str(settings.MEDIA_ROOT)
    # file_url may be absolute URL or relative path
    local_path = None
    if mat.file_url:
        # Strip base URL to get relative storage path
        media_url = settings.MEDIA_URL  # e.g. '/media/'
        if media_url in mat.file_url:
            rel = mat.file_url.split(media_url, 1)[-1]
            candidate = os.path.join(media_root, rel)
            if os.path.exists(candidate):
                local_path = candidate

    if local_path is None:
        # Fall back to HTTP download
        response = req.get(mat.file_url, timeout=60)
        response.raise_for_status()
        ext = f'.{mat.file_type.lower()}'
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(response.content)
            local_path = tmp.name

    return doc_processor.extract_text(local_path)


class ChatSessionViewSet(viewsets.ViewSet):
    """Chat sessions and messages stored in MongoDB."""

    def list(self, request):
        sessions = list(
            get_collection('chat_sessions')
            .find({'user_id': str(request.user.id)}, {'messages': 0})
            .sort('updated_at', -1)
            .limit(50)
        )
        for s in sessions:
            s['id'] = s.pop('_id')
        return Response(sessions)

    def retrieve(self, request, pk=None):
        # pk is the session token (UUID string)
        session = get_collection('chat_sessions').find_one(
            {'_id': pk, 'user_id': str(request.user.id)}  # strict user scope
        )
        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        session['id'] = session.pop('_id')
        return Response(session)

    def destroy(self, request, pk=None):
        result = get_collection('chat_sessions').delete_one(
            {'_id': pk, 'user_id': str(request.user.id)}  # only owner can delete
        )
        if result.deleted_count == 0:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def chat(self, request):
        """HTTP fallback for chat (WebSocket is preferred for real-time streaming)."""
        message     = request.data.get('message', '').strip()
        session_id  = request.data.get('session_id')
        subject_id  = request.data.get('subject_id')
        material_id = request.data.get('material_id')
        language    = request.data.get('language', 'english')

        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        col = get_collection('chat_sessions')

        if session_id:
            # Strict ownership: session must belong to this user
            session = col.find_one({'_id': session_id, 'user_id': str(request.user.id)})
            if not session:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            session_id = str(uuid.uuid4())  # unique token per chat session
            subject_name = None
            if subject_id:
                subj = Subject.objects.filter(id=subject_id).first()
                subject_name = subj.name if subj else None
            session = {
                '_id': session_id,
                'user_id': str(request.user.id),
                'user_email': request.user.email,
                'subject_id': subject_id,
                'subject_name': subject_name,
                'title': message[:60],
                'messages': [],
                'created_at': _now(),
                'updated_at': _now(),
            }
            col.insert_one(session)

        user_msg = {'id': str(uuid.uuid4()), 'role': 'user', 'content': message, 'sources': [], 'created_at': _now()}

        msgs = session.get('messages', [])
        history = [
            (msgs[i]['content'], msgs[i + 1]['content'])
            for i in range(0, len(msgs) - 1, 2)
            if msgs[i]['role'] == 'user' and msgs[i + 1]['role'] == 'assistant'
        ]

        if material_id:
            mat, err = _assert_material_access(material_id, request.user)
            if err:
                return err
            collection_name = mat.vector_collection_id if mat.is_processed else f'user_{request.user.id}'
        elif subject_id:
            collection_name = f'subject_{subject_id}'
        else:
            collection_name = f'user_{request.user.id}'

        try:
            result = gemini_rag.query(
                question=message,
                collection_name=collection_name,
                chat_history=history,
                language=language,
            )
            answer  = result['answer']
            sources = result['sources']
            tokens  = result.get('tokens_used', 0)
            model   = result.get('model', 'gemini-1.5-flash')
        except ValueError as e:
            logger.error(f'Gemini config error: {e}')
            return Response({'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f'Gemini RAG error: {e}')
            err_str = str(e)
            if '429' in err_str or 'quota' in err_str.lower():
                return Response(
                    {'error': 'Rate limit reached. You are on the free tier — wait 60 seconds and try again, or upgrade at https://ai.dev/rate-limit'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            return Response(
                {'error': f'AI service error: {err_str[:300]}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        assistant_msg = {'id': str(uuid.uuid4()), 'role': 'assistant', 'content': answer, 'sources': sources, 'created_at': _now()}

        col.update_one(
            {'_id': session_id},
            {'$push': {'messages': {'$each': [user_msg, assistant_msg]}}, '$set': {'updated_at': _now()}}
        )
        AIUsageLog.objects.create(
            user=request.user, action='chat_http',
            tokens_used=tokens, model_used=model,
            metadata={'session_id': session_id},
        )
        return Response({'session_id': session_id, 'user_message': user_msg, 'assistant_message': assistant_msg})


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filterset_fields = ['subject', 'difficulty', 'is_published']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Quiz.objects.all()
        # Students see their own quizzes + published quizzes for their subjects
        return Quiz.objects.filter(created_by=user) | Quiz.objects.filter(
            subject__semester__enrollments__student=user, is_published=True
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_ai_generated=False)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = GenerateQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        mat, err = _assert_material_access(data['material_id'], request.user)
        if err:
            return err

        try:
            text = _read_material_text(mat)
            questions = gemini_rag.generate_quiz(text, data['num_questions'], data['difficulty'])

            # subject is required by model — use material's subject or create a placeholder
            subject = mat.subject
            if subject is None:
                from apps.courses.models import Subject, Semester
                sem, _ = Semester.objects.get_or_create(
                    number=0, department='General', academic_year='N/A',
                    defaults={'name': 'General', 'created_by': request.user}
                )
                subject, _ = Subject.objects.get_or_create(
                    semester=sem, code='GEN',
                    defaults={'name': 'General', 'credits': 0}
                )

            quiz = Quiz.objects.create(
                subject=subject,
                material=mat,
                created_by=request.user,
                title=data.get('title') or f'Quiz - {mat.title}',
                difficulty=data['difficulty'],
                questions=questions,
                is_ai_generated=True,
                is_published=True,
            )
            AIUsageLog.objects.create(user=request.user, action='generate_quiz')
            return Response(QuizSerializer(quiz).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Quiz generation error: {e}', exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        qs = QuizAttempt.objects.filter(quiz=quiz, student=request.user).order_by('-completed_at')
        return Response(QuizAttemptSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        answers = request.data.get('answers', [])
        time_taken = request.data.get('time_taken_seconds', 0)

        correct = 0
        for i, q in enumerate(quiz.questions):
            if i >= len(answers):
                break
            selected = answers[i].get('selected') if isinstance(answers[i], dict) else answers[i]
            correct_ans = q.get('correct_answer')
            # correct_answer can be letter ("A") or index (0)
            if isinstance(correct_ans, str) and len(correct_ans) == 1 and correct_ans in 'ABCD':
                correct_idx = 'ABCD'.index(correct_ans)
                if isinstance(selected, int):
                    correct += selected == correct_idx
                elif isinstance(selected, str):
                    correct += selected == correct_ans
            elif isinstance(correct_ans, int):
                correct += selected == correct_ans

        total = len(quiz.questions)
        score = (correct / total * 100) if total else 0
        attempt = QuizAttempt.objects.create(
            quiz=quiz, student=request.user,
            answers=answers, score=round(score, 2),
            total_questions=total,
            time_taken_seconds=time_taken,
        )
        return Response(QuizAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class FlashcardViewSet(viewsets.ModelViewSet):
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filterset_fields = ['subject']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Flashcard.objects.all()
        if user.role == 'student':
            return Flashcard.objects.filter(
                subject__semester__enrollments__student=user
            ) | Flashcard.objects.filter(created_by=user)
        return Flashcard.objects.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, is_ai_generated=False)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = GenerateFlashcardsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        mat, err = _assert_material_access(data['material_id'], request.user)
        if err:
            return err

        try:
            text = _read_material_text(mat)
            cards = gemini_rag.generate_flashcards(text, data['num_cards'])

            subject = mat.subject
            if subject is None:
                from apps.courses.models import Subject, Semester
                sem, _ = Semester.objects.get_or_create(
                    number=0, department='General', academic_year='N/A',
                    defaults={'name': 'General', 'created_by': request.user}
                )
                subject, _ = Subject.objects.get_or_create(
                    semester=sem, code='GEN',
                    defaults={'name': 'General', 'credits': 0}
                )

            flashcard = Flashcard.objects.create(
                subject=subject,
                material=mat,
                created_by=request.user,
                title=data.get('title') or f'Flashcards - {mat.title}',
                cards=cards,
                is_ai_generated=True,
            )
            AIUsageLog.objects.create(user=request.user, action='generate_flashcards')
            return Response(FlashcardSerializer(flashcard).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Flashcard generation error: {e}', exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer

    def get_queryset(self):
        return StudyPlan.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = StudyPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subjects = Subject.objects.filter(id__in=data['subject_ids'])
        subject_names = [s.name for s in subjects]

        plan_data = gemini_rag.generate_study_plan(
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
        serializer = SummarizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mat, err = _assert_material_access(serializer.validated_data['material_id'], request.user)
        if err:
            return err

        try:
            text = _read_material_text(mat)
            summary = gemini_rag.summarize(text)
            AIUsageLog.objects.create(user=request.user, action='summarize')
            return Response({'summary': summary})
        except Exception as e:
            logger.error(f'Summarize error: {e}', exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
