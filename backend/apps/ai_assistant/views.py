import uuid
import logging
from datetime import datetime, timezone as dt_tz
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    ChatMessage, ChatSession, Goal, PomodoroSession, Quiz, QuizAttempt,
    Flashcard, StudyNote, StudyPlan, AIUsageLog,
)
from .gemini_rag import gemini_rag, doc_processor
from .serializers import (
    QuizSerializer, QuizAttemptSerializer,
    FlashcardSerializer, GoalSerializer, PomodoroSessionSerializer, StudyNoteSerializer, StudyPlanSerializer,
    GenerateQuizSerializer, GenerateFlashcardsSerializer,
    SummarizeSerializer, StudyPlanRequestSerializer,
)
from apps.courses.models import StudyMaterial, Subject
from apps.accounts.permissions import IsOwnerOrAdmin

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(dt_tz.utc)


def _assert_material_access(material_id, user):
    """Return material only when it belongs to the current user or the user is admin."""
    try:
        mat = StudyMaterial.objects.get(id=material_id)
    except StudyMaterial.DoesNotExist:
        return None, Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)
    if getattr(user, 'role', '') != 'admin' and mat.uploaded_by_id != user.id:
        return None, Response({'error': 'Material not found'}, status=status.HTTP_404_NOT_FOUND)
    return mat, None


def _drive_file_id_from_url(url: str) -> str:
    from urllib.parse import urlparse, parse_qs

    if not url or 'drive.google.com' not in url:
        return ''
    try:
        parsed = urlparse(url)
        query_id = parse_qs(parsed.query).get('id', [''])[0]
        if query_id:
            return query_id

        parts = [part for part in parsed.path.split('/') if part]
        for index, part in enumerate(parts):
            if part in {'d', 'file', 'uc'} and index + 1 < len(parts):
                candidate = parts[index + 1]
                if candidate and candidate != 'view':
                    return candidate
        return ''
    except Exception:
        return ''


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
        drive_file_id = getattr(mat, 'drive_file_id', '') or _drive_file_id_from_url(mat.file_url)
        if drive_file_id:
            try:
                from apps.files.models import GoogleDriveToken
                from apps.files.views import _get_valid_access_token, GOOGLE_DRIVE_FILES_URL

                token_obj = GoogleDriveToken.objects.filter(user=mat.uploaded_by).first()
                if token_obj:
                    access_token = _get_valid_access_token(token_obj)
                    if access_token:
                        response = req.get(
                            f'{GOOGLE_DRIVE_FILES_URL}/{drive_file_id}',
                            params={'alt': 'media', 'acknowledgeAbuse': 'true'},
                            headers={'Authorization': f'Bearer {access_token}'},
                            timeout=60,
                        )
                        response.raise_for_status()
                        ext = f'.{mat.file_type.lower()}'
                        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                            tmp.write(response.content)
                            local_path = tmp.name
            except Exception:
                local_path = None

    if local_path is None:
        # Fall back to HTTP download
        response = req.get(mat.file_url, timeout=60)
        response.raise_for_status()
        ext = f'.{mat.file_type.lower()}'
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(response.content)
            local_path = tmp.name

    return doc_processor.extract_text(local_path)


def _user_material_collections(user) -> list[str]:
    """Return collections that may contain this user's uploaded study material."""
    qs = StudyMaterial.objects.filter(uploaded_by=user, is_processed=True).exclude(vector_collection_id__isnull=True)
    names = [f'user_{user.id}']
    seen = set(names)
    for name in qs.order_by('-created_at').values_list('vector_collection_id', flat=True)[:20]:
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    return names


class ChatSessionViewSet(viewsets.ViewSet):
    """User-scoped AI chat sessions stored in the primary database."""

    permission_classes = [permissions.IsAuthenticated]

    def _message_payload(self, msg):
        return {
            'id': str(msg.id),
            'role': msg.role,
            'content': msg.content,
            'sources': msg.sources or [],
            'created_at': msg.created_at,
        }

    def _session_payload(self, session, include_messages=False):
        payload = {
            'id': str(session.id),
            'token': str(session.client_token),
            'title': session.title,
            'subject_id': str(session.subject_id) if session.subject_id else None,
            'subject_name': session.subject_name,
            'created_at': session.created_at,
            'updated_at': session.updated_at,
        }
        if include_messages:
            payload['messages'] = [self._message_payload(m) for m in session.messages.all()]
        return payload

    def list(self, request):
        sessions = ChatSession.objects.filter(user=request.user).order_by('-updated_at')[:50]
        return Response([self._session_payload(s) for s in sessions])

    def retrieve(self, request, pk=None):
        try:
            session = ChatSession.objects.prefetch_related('messages').get(id=pk, user=request.user)
        except (ChatSession.DoesNotExist, ValueError):
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._session_payload(session, include_messages=True))

    def destroy(self, request, pk=None):
        try:
            deleted, _ = ChatSession.objects.filter(id=pk, user=request.user).delete()
        except (ValidationError, ValueError):
            deleted = 0
        if deleted == 0:
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

        if session_id:
            # Strict ownership: session must belong to this user
            try:
                session = ChatSession.objects.prefetch_related('messages').get(id=session_id, user=request.user)
            except (ChatSession.DoesNotExist, ValueError):
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            subject_name = None
            subject = None
            if subject_id:
                subject = Subject.objects.filter(id=subject_id).first()
                subject_name = subject.name if subject else None
            session = ChatSession.objects.create(
                user=request.user,
                subject=subject,
                subject_name=subject_name or '',
                title=message[:60],
            )
            session_id = str(session.id)

        msgs = list(session.messages.all())
        history = [
            (msgs[i].content, msgs[i + 1].content)
            for i in range(0, len(msgs) - 1, 2)
            if msgs[i].role == ChatMessage.Role.USER and msgs[i + 1].role == ChatMessage.Role.ASSISTANT
        ]

        user_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.USER,
            content=message,
            sources=[],
        )

        collection_names = []
        if material_id:
            mat, err = _assert_material_access(material_id, request.user)
            if err:
                return err
            collection_names = [mat.vector_collection_id] if mat.is_processed and mat.vector_collection_id else [f'user_{request.user.id}']
        elif subject_id:
            collection_names = [f'subject_{subject_id}']
        else:
            collection_names = _user_material_collections(request.user)

        try:
            result = gemini_rag.query_collections(
                question=message,
                collection_names=collection_names,
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

        assistant_msg = ChatMessage.objects.create(
            session=session,
            role=ChatMessage.Role.ASSISTANT,
            content=answer,
            sources=sources,
        )
        session.save(update_fields=['updated_at'])
        AIUsageLog.objects.create(
            user=request.user, action='chat_http',
            tokens_used=tokens, model_used=model,
            metadata={'session_id': session_id},
        )
        try:
            from core.activity import record_activity
            record_activity(request.user, 'ai_session')
        except Exception:
            pass
        return Response({
            'session_id': session_id,
            'user_message': self._message_payload(user_msg),
            'assistant_message': self._message_payload(assistant_msg),
        })


class ChatHealthView(APIView):
    """Lightweight smoke-test endpoint that never calls Gemini."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({
            'response': 'Hello! How can I help you?',
            'success': True,
        })

    def get(self, request):
        return Response({
            'response': 'Hello! How can I help you?',
            'success': True,
        })


class QuizViewSet(viewsets.ModelViewSet):
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filterset_fields = ['subject', 'difficulty', 'is_published']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Quiz.objects.all()
        # Students see their own quizzes + published quizzes for their subjects
        return (Quiz.objects.filter(created_by=user) | Quiz.objects.filter(
            subject__semester__enrollments__student=user, is_published=True
        )).distinct()

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
            if not text.strip():
                return Response(
                    {'error': 'Could not extract readable text from the uploaded document.'},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            generated = gemini_rag.generate_quiz(text, data['num_questions'], data['difficulty'])
            questions = generated['items']
            if not questions:
                return Response(
                    {'error': 'Gemini returned no quiz questions. Check your API key and document text.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

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
            AIUsageLog.objects.create(
                user=request.user,
                action='generate_quiz',
                tokens_used=generated.get('tokens_used', 0),
                model_used=generated.get('model', 'gemini-2.0-flash-lite'),
                metadata={'quiz_id': str(quiz.id), 'material_id': str(mat.id)},
            )
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
        # Update SubjectMastery
        try:
            from apps.analytics.models import SubjectMastery
            from core.activity import record_activity
            mastery, _ = SubjectMastery.objects.get_or_create(
                user=request.user, subject=quiz.subject
            )
            mastery.attempts += 1
            mastery.avg_score = (
                (mastery.avg_score * (mastery.attempts - 1) + round(score, 2)) / mastery.attempts
            )
            mastery.save(update_fields=['attempts', 'avg_score'])
            record_activity(request.user, 'quiz_attempt')
        except Exception:
            pass
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
            return (Flashcard.objects.filter(
                subject__semester__enrollments__student=user
            ) | Flashcard.objects.filter(created_by=user)).distinct()
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
            if not text.strip():
                return Response(
                    {'error': 'Could not extract readable text from the uploaded document.'},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            generated = gemini_rag.generate_flashcards(text, data['num_cards'])
            cards = generated['items']
            if not cards:
                return Response(
                    {'error': 'Gemini returned no flashcards. Check your API key and document text.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

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
            AIUsageLog.objects.create(
                user=request.user,
                action='generate_flashcards',
                tokens_used=generated.get('tokens_used', 0),
                model_used=generated.get('model', 'gemini-2.0-flash-lite'),
                metadata={'flashcard_id': str(flashcard.id), 'material_id': str(mat.id)},
            )
            try:
                from core.activity import record_activity
                record_activity(request.user, 'flashcard_review')
            except Exception:
                pass
            return Response(FlashcardSerializer(flashcard).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f'Flashcard generation error: {e}', exc_info=True)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

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


class StudyNoteViewSet(viewsets.ModelViewSet):
    serializer_class = StudyNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['subject', 'pinned', 'favorite']
    search_fields = ['title', 'content', 'subject_label']

    def get_queryset(self):
        return StudyNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = GoalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['linked_activity']

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def progress(self, request, pk=None):
        goal = self.get_object()
        delta = float(request.data.get('delta', 0))
        goal.current = max(0, min(goal.target, goal.current + delta))
        goal.save(update_fields=['current', 'updated_at'])
        return Response(GoalSerializer(goal).data)


class PomodoroSessionViewSet(viewsets.ModelViewSet):
    serializer_class = PomodoroSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return PomodoroSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        session = serializer.save(user=self.request.user)
        try:
            for goal in Goal.objects.filter(user=self.request.user, linked_activity=Goal.LinkedActivity.FOCUS):
                goal.current = max(0, min(goal.target, goal.current + session.minutes / 60))
                goal.save(update_fields=['current', 'updated_at'])
        except Exception:
            pass


class SummarizeView(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def summarize(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

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
