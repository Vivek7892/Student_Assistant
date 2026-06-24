from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.accounts.permissions import IsAdmin, IsTeacher
from .models import Semester, Subject, StudyMaterial, StudentSemesterEnrollment, LearningResource
from .serializers import (
    SemesterSerializer, SubjectSerializer, StudyMaterialSerializer,
    EnrollmentSerializer, LearningResourceSerializer
)


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'academic_year', 'is_active']
    search_fields = ['name', 'department']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTeacher()]
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
            return [IsTeacher()]
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
    queryset = StudyMaterial.objects.select_related('subject', 'uploaded_by').all()
    serializer_class = StudyMaterialSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['subject', 'material_type', 'is_processed']
    search_fields = ['title', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

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
            return [IsTeacher()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)
