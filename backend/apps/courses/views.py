from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.conf import settings
import requests, re
from apps.accounts.permissions import IsAdmin, IsTeacherOrAdmin
from .models import Semester, Subject, StudyMaterial, StudentSemesterEnrollment, LearningResource, PlannerTask, YouTubeResource
from .serializers import (
    SemesterSerializer, SubjectSerializer, StudyMaterialSerializer,
    EnrollmentSerializer, LearningResourceSerializer, PlannerTaskSerializer, YouTubeResourceSerializer
)


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'academic_year', 'is_active']
    search_fields = ['name', 'department']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def subjects(self, request, pk=None):
        semester = self.get_object()
        subjects = semester.subjects.filter(is_active=True)
        return Response(SubjectSerializer(subjects, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def enroll(self, request, pk=None):
        semester = self.get_object()
        enrollment, created = StudentSemesterEnrollment.objects.get_or_create(
            student=request.user, semester=semester
        )
        return Response(EnrollmentSerializer(enrollment).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('semester', 'teacher').all()
    serializer_class = SubjectSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['semester', 'teacher', 'is_active']
    search_fields = ['name', 'code']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def materials(self, request, pk=None):
        subject = self.get_object()
        material_type = request.query_params.get('type')
        qs = subject.materials.all()
        if material_type:
            qs = qs.filter(material_type=material_type)
        return Response(StudyMaterialSerializer(qs, many=True).data)


class StudyMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = StudyMaterialSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'material_type', 'is_processed']
    search_fields = ['title', 'description']

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return StudyMaterial.objects.select_related('subject', 'uploaded_by').all()
        return StudyMaterial.objects.select_related('subject', 'uploaded_by').filter(
            uploaded_by=user
        )

    def perform_create(self, serializer):
        material = serializer.save(uploaded_by=self.request.user)
        from apps.ai_assistant.tasks import process_document
        try:
            process_document.delay(str(material.id))
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def increment_download(self, request, pk=None):
        material = self.get_object()
        material.download_count += 1
        material.save(update_fields=['download_count'])
        return Response({'download_count': material.download_count})


class LearningResourceViewSet(viewsets.ModelViewSet):
    queryset = LearningResource.objects.all()
    serializer_class = LearningResourceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['subject', 'resource_type']
    search_fields = ['title', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)


class YouTubeResourceViewSet(viewsets.ModelViewSet):
    serializer_class = YouTubeResourceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['subject']

    def get_queryset(self):
        # Return all youtube resources for subjects the user can see
        return YouTubeResource.objects.filter(added_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)

    def _extract_id(self, url):
        m = re.search(r'(?:v=|youtu\.be/|embed/)([\w-]{11})', url)
        return m.group(1) if m else None

    def _fetch_meta(self, yt_id):
        api_key = getattr(settings, 'YOUTUBE_API_KEY', '')
        if not api_key:
            return {'title': yt_id, 'thumbnail': f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg', 'channel': '', 'duration': '', 'view_count': 0}
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/videos',
            params={'id': yt_id, 'part': 'snippet,contentDetails,statistics', 'key': api_key},
            timeout=8
        ).json()
        items = resp.get('items', [])
        if not items:
            return {'title': yt_id, 'thumbnail': f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg', 'channel': '', 'duration': '', 'view_count': 0}
        item = items[0]
        raw_dur = item['contentDetails']['duration']  # PT12M34S
        duration = self._parse_duration(raw_dur)
        return {
            'title':      item['snippet']['title'],
            'thumbnail':  item['snippet']['thumbnails'].get('medium', {}).get('url', f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg'),
            'channel':    item['snippet']['channelTitle'],
            'duration':   duration,
            'view_count': int(item['statistics'].get('viewCount', 0)),
        }

    def _parse_duration(self, iso):
        m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
        if not m:
            return ''
        h, mn, s = m.group(1), m.group(2), m.group(3)
        parts = []
        if h:  parts.append(h.zfill(2))
        parts.append((mn or '0').zfill(2))
        parts.append((s  or '0').zfill(2))
        return ':'.join(parts)


class PlannerTaskViewSet(viewsets.ModelViewSet):
    serializer_class = PlannerTaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['day', 'done']

    def get_queryset(self):
        return PlannerTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        task = self.get_object()
        task.done = not task.done
        task.save(update_fields=['done'])
        return Response(PlannerTaskSerializer(task).data)
