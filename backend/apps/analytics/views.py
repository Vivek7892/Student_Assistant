from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count, Avg
from apps.accounts.models import User
from apps.courses.models import Semester, Subject, StudyMaterial
from apps.ai_assistant.models import ChatSession, QuizAttempt, AIUsageLog
from apps.assignments.models import Assignment, AssignmentSubmission


class StudentAnalyticsView(APIView):
    def get(self, request):
        user = request.user
        quiz_stats = QuizAttempt.objects.filter(student=user).aggregate(
            total=Count('id'), avg_score=Avg('score')
        )
        submissions = AssignmentSubmission.objects.filter(student=user)
        chat_sessions = ChatSession.objects.filter(user=user).count()
        recent_scores = list(
            QuizAttempt.objects.filter(student=user)
            .order_by('-completed_at')[:10]
            .values('quiz__title', 'score', 'completed_at')
        )
        return Response({
            'quiz_stats': quiz_stats,
            'submissions_count': submissions.count(),
            'graded_submissions': submissions.filter(status='graded').count(),
            'chat_sessions_count': chat_sessions,
            'recent_quiz_scores': recent_scores,
            'avg_assignment_score': submissions.filter(marks_obtained__isnull=False).aggregate(
                avg=Avg('marks_obtained')
            )['avg'] or 0,
        })


class TeacherAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        subjects = Subject.objects.filter(teacher=user)
        assignments = Assignment.objects.filter(created_by=user)
        total_students = User.objects.filter(
            semester_enrollments__semester__subjects__teacher=user
        ).distinct().count()
        return Response({
            'subjects_count': subjects.count(),
            'assignments_count': assignments.count(),
            'total_students': total_students,
            'pending_grading': AssignmentSubmission.objects.filter(
                assignment__created_by=user, status='submitted'
            ).count(),
            'materials_uploaded': StudyMaterial.objects.filter(uploaded_by=user).count(),
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=403)
        return Response({
            'total_users': User.objects.count(),
            'students': User.objects.filter(role='student').count(),
            'teachers': User.objects.filter(role='teacher').count(),
            'total_semesters': Semester.objects.count(),
            'total_subjects': Subject.objects.count(),
            'total_materials': StudyMaterial.objects.count(),
            'ai_requests_today': AIUsageLog.objects.filter(
                created_at__date=__import__('django.utils.timezone', fromlist=['timezone']).timezone.now().date()
            ).count(),
            'users_by_role': list(User.objects.values('role').annotate(count=Count('id'))),
            'materials_by_type': list(StudyMaterial.objects.values('material_type').annotate(count=Count('id'))),
        })
