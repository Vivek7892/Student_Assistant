from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.conf import settings
from django.utils import timezone
import requests, re
from datetime import datetime, timedelta, timezone as dt_timezone
from urllib.parse import urlencode
from apps.accounts.permissions import IsAdmin, IsTeacherOrAdmin
from .models import Semester, Subject, StudyMaterial, StudentSemesterEnrollment, LearningResource, PlannerTask, YouTubeResource, VideoFolder
from .serializers import (
    SemesterSerializer, SubjectSerializer, StudyMaterialSerializer,
    EnrollmentSerializer, LearningResourceSerializer, PlannerTaskSerializer,
    YouTubeResourceSerializer, VideoFolderSerializer
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


class VideoFolderViewSet(viewsets.ModelViewSet):
    serializer_class = VideoFolderSerializer

    def get_queryset(self):
        return VideoFolder.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        folder = self.get_object()
        move_to = request.data.get('move_to')  # optional folder id to move videos into
        if move_to:
            try:
                target = VideoFolder.objects.get(id=move_to, owner=request.user)
                folder.videos.all().update(folder=target)
            except VideoFolder.DoesNotExist:
                folder.videos.all().update(folder=None)
        else:
            folder.videos.all().update(folder=None)
        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class YouTubeResourceViewSet(viewsets.ModelViewSet):
    serializer_class = YouTubeResourceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['subject', 'folder', 'status', 'is_favorite']
    search_fields = ['title', 'channel', 'notes', 'tags']

    def get_queryset(self):
        return YouTubeResource.objects.filter(added_by=self.request.user).select_related('folder')

    def perform_create(self, serializer):
        url = serializer.validated_data.get('url', '')
        yt_id = self._extract_id(url)
        if not yt_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'url': 'Invalid YouTube URL'})
        meta = self._fetch_meta(yt_id)
        serializer.save(
            added_by=self.request.user,
            youtube_id=yt_id,
            title=meta['title'],
            thumbnail=meta['thumbnail'],
            channel=meta['channel'],
            duration=meta['duration'],
            view_count=meta['view_count'],
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='preview')
    def preview(self, request):
        url = request.query_params.get('url', '')
        yt_id = self._extract_id(url)
        if not yt_id:
            return Response({'error': 'Invalid YouTube URL'}, status=status.HTTP_400_BAD_REQUEST)
        meta = self._fetch_meta(yt_id)
        return Response({**meta, 'youtube_id': yt_id, 'url': f'https://www.youtube.com/watch?v={yt_id}'})

    def _extract_id(self, url):
        m = re.search(r'(?:v=|youtu\.be/|embed/)([\w-]{11})', url)
        return m.group(1) if m else None

    def _fetch_meta(self, yt_id):
        api_key = getattr(settings, 'YOUTUBE_API_KEY', '')
        if not api_key:
            return self._fetch_oembed_meta(yt_id)
        resp = requests.get(
            'https://www.googleapis.com/youtube/v3/videos',
            params={'id': yt_id, 'part': 'snippet,contentDetails,statistics', 'key': api_key},
            timeout=8
        ).json()
        items = resp.get('items', [])
        if not items:
            return {'title': yt_id, 'thumbnail': f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg', 'channel': '', 'duration': '', 'view_count': 0}
        item = items[0]
        return {
            'title':      item['snippet']['title'],
            'thumbnail':  item['snippet']['thumbnails'].get('medium', {}).get('url', f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg'),
            'channel':    item['snippet']['channelTitle'],
            'duration':   self._parse_duration(item['contentDetails']['duration']),
            'view_count': int(item['statistics'].get('viewCount', 0)),
        }

    def _fetch_oembed_meta(self, yt_id):
        try:
            url = f'https://www.youtube.com/watch?v={yt_id}'
            resp = requests.get(
                'https://www.youtube.com/oembed',
                params={'url': url, 'format': 'json'},
                timeout=8,
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                'title': data.get('title') or yt_id,
                'thumbnail': data.get('thumbnail_url') or f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg',
                'channel': data.get('author_name') or '',
                'duration': '',
                'view_count': 0,
            }
        except Exception:
            return {'title': yt_id, 'thumbnail': f'https://img.youtube.com/vi/{yt_id}/mqdefault.jpg', 'channel': '', 'duration': '', 'view_count': 0}

    def _parse_duration(self, iso):
        m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
        if not m:
            return ''
        h, mn, s = m.group(1), m.group(2), m.group(3)
        parts = []
        if h: parts.append(h.zfill(2))
        parts.append((mn or '0').zfill(2))
        parts.append((s or '0').zfill(2))
        return ':'.join(parts)


class PlannerTaskViewSet(viewsets.ModelViewSet):
    serializer_class = PlannerTaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['day', 'done']

    def get_queryset(self):
        return PlannerTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _week_start(self, request):
        raw = request.data.get('week_start') or request.query_params.get('week_start')
        if raw:
            try:
                parsed = datetime.fromisoformat(raw).date()
                return parsed - timedelta(days=parsed.weekday())
            except ValueError:
                pass
        today = timezone.localdate()
        return today - timedelta(days=today.weekday())

    def _calendar_url(self, task, week_start):
        day_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        day_index = day_order.index(task.day) if task.day in day_order else 0
        start_date = week_start + timedelta(days=day_index)
        start = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
        start = start.replace(hour=task.start_hour, minute=0, second=0, microsecond=0)
        end = start + timedelta(hours=task.duration or 1)
        fmt = '%Y%m%dT%H%M%SZ'
        title = task.title + (f' - {task.subject_label}' if task.subject_label else '')
        params = urlencode({
            'action': 'TEMPLATE',
            'text': title,
            'dates': f'{start.astimezone(dt_timezone.utc).strftime(fmt)}/{end.astimezone(dt_timezone.utc).strftime(fmt)}',
            'details': f'Study session from StudyBuddy{chr(10) + "Subject: " + task.subject_label if task.subject_label else ""}',
        })
        return f'https://calendar.google.com/calendar/render?{params}'

    @action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        task = self.get_object()
        task.done = not task.done
        task.save(update_fields=['done', 'updated_at'])
        return Response(PlannerTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='sync-google-calendar')
    def sync_google_calendar(self, request, pk=None):
        task = self.get_object()
        calendar_url = self._calendar_url(task, self._week_start(request))
        task.mark_google_synced(calendar_url)
        return Response(PlannerTaskSerializer(task).data)

    @action(detail=False, methods=['post'], url_path='sync-google-calendar')
    def sync_all_google_calendar(self, request):
        week_start = self._week_start(request)
        tasks = self.get_queryset().filter(done=False)
        synced = []
        for task in tasks:
            calendar_url = self._calendar_url(task, week_start)
            task.mark_google_synced(calendar_url)
            synced.append(task)
        return Response({
            'count': len(synced),
            'items': PlannerTaskSerializer(synced, many=True).data,
        })
