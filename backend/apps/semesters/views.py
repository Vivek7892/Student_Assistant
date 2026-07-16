from django.db.models import Avg, Sum
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Semester, Subject
from .serializers import SemesterSerializer, SubjectSerializer


class SemesterViewSet(viewsets.ModelViewSet):
    serializer_class = SemesterSerializer

    def get_queryset(self):
        return Semester.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        semester = self.get_object()
        subjects = semester.subjects.all()
        total_credits = subjects.aggregate(t=Sum('credits'))['t'] or 0
        avg_progress = subjects.aggregate(a=Avg('progress'))['a'] or 0
        return Response({
            'overall_progress': round(avg_progress, 1),
            'total_credits': total_credits,
            'subject_count': subjects.count(),
        })


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer

    def get_queryset(self):
        return Subject.objects.filter(semester__user=self.request.user,
                                      semester_id=self.kwargs['semester_pk'])

    def perform_create(self, serializer):
        semester = Semester.objects.get(pk=self.kwargs['semester_pk'], user=self.request.user)
        serializer.save(semester=semester)
