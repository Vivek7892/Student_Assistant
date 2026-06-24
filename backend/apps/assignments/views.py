from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsTeacher
from .models import Assignment, AssignmentSubmission
from .serializers import AssignmentSerializer, AssignmentSubmissionSerializer, GradeSubmissionSerializer


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    filterset_fields = ['subject', 'status']
    search_fields = ['title']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return Assignment.objects.filter(
                subject__semester__enrollments__student=user, status='published'
            )
        return Assignment.objects.filter(created_by=user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTeacher()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        assignment = self.get_object()
        submissions = assignment.submissions.select_related('student').all()
        return Response(AssignmentSubmissionSerializer(submissions, many=True).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        existing = AssignmentSubmission.objects.filter(assignment=assignment, student=request.user).first()
        if existing:
            return Response({'error': 'Already submitted'}, status=status.HTTP_400_BAD_REQUEST)
        is_late = timezone.now() > assignment.due_date
        submission = AssignmentSubmission.objects.create(
            assignment=assignment,
            student=request.user,
            file_url=request.data.get('file_url', ''),
            file_name=request.data.get('file_name', ''),
            remarks=request.data.get('remarks', ''),
            status='late' if is_late else 'submitted',
        )
        return Response(AssignmentSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return AssignmentSubmission.objects.filter(student=user)
        return AssignmentSubmission.objects.filter(assignment__created_by=user)

    @action(detail=True, methods=['post'], permission_classes=[IsTeacher])
    def grade(self, request, pk=None):
        submission = self.get_object()
        serializer = GradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission.marks_obtained = serializer.validated_data['marks_obtained']
        submission.feedback = serializer.validated_data.get('feedback', '')
        submission.status = 'graded'
        submission.graded_at = timezone.now()
        submission.graded_by = request.user
        submission.save()
        return Response(AssignmentSubmissionSerializer(submission).data)
