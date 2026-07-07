from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count, Avg
from apps.accounts.models import User
from apps.courses.models import Semester, Subject, StudyMaterial
from apps.ai_assistant.models import QuizAttempt, AIUsageLog
from apps.assignments.models import Assignment, AssignmentSubmission
from core.mongo import get_collection


class StudentAnalyticsView(APIView):
    def get(self, request):
        from django.utils import timezone
        import datetime

        user = request.user
        quiz_attempts = QuizAttempt.objects.filter(student=user).order_by('completed_at')
        quiz_stats = quiz_attempts.aggregate(total=Count('id'), avg_score=Avg('score'))
        submissions = AssignmentSubmission.objects.filter(student=user)
        chat_sessions_count = get_collection('chat_sessions').count_documents({'user_id': str(user.id)})
        profile = getattr(user, 'student_profile', None)

        # Quiz history for line chart
        quiz_history = [
            {
                'date': a.completed_at.strftime('%b %d') if a.completed_at else '',
                'score': round(a.score or 0),
                'title': getattr(a.quiz, 'title', '') if a.quiz else '',
                'questions': getattr(a.quiz, 'questions_count', 0) if a.quiz else 0,
            }
            for a in quiz_attempts
        ]

        # Activity map: date → session count (last 365 days)
        today = timezone.now().date()
        start = today - datetime.timedelta(days=364)
        activity_map: dict = {}
        sessions = get_collection('chat_sessions').find(
            {'user_id': str(user.id), 'created_at': {'$gte': datetime.datetime.combine(start, datetime.time.min)}},
            {'created_at': 1}
        )
        for s in sessions:
            d = s.get('created_at')
            if d:
                key = d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d)[:10]
                activity_map[key] = activity_map.get(key, 0) + 1

        # Streak calculation
        streak = getattr(profile, 'streak', 0)
        longest_streak = 0
        cur_streak = 0
        prev = None
        for key in sorted(activity_map.keys()):
            d = datetime.date.fromisoformat(key)
            if prev and (d - prev).days == 1:
                cur_streak += 1
            else:
                cur_streak = 1
            longest_streak = max(longest_streak, cur_streak)
            prev = d

        # Subject mastery from quiz scores
        subject_mastery = []
        for subj_name, attempts in {}. items():  # placeholder — extend if quiz has subject FK
            pass

        # Weekly activity (last 7 days)
        weekly_activity = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            key = d.strftime('%Y-%m-%d')
            weekly_activity.append({'day': d.strftime('%a'), 'sessions': activity_map.get(key, 0)})

        return Response({
            'total_study_hours': round((quiz_attempts.count() * 0.5) + (chat_sessions_count * 0.25), 1),
            'avg_quiz_score': round(quiz_stats['avg_score'] or 0),
            'streak': streak,
            'longest_streak': longest_streak,
            'total_sessions': chat_sessions_count,
            'quiz_history': quiz_history,
            'activity_map': activity_map,
            'weekly_activity': weekly_activity,
            'subject_mastery': subject_mastery,
            'submissions_count': submissions.count(),
            'xp': getattr(profile, 'xp', 0),
            'level': getattr(profile, 'level', 1),
        })


class TeacherAnalyticsView(APIView):
    def get(self, request):
        user = request.user
        if user.role not in ('teacher', 'admin'):
            return Response({'error': 'Forbidden'}, status=403)

        subjects = Subject.objects.filter(teacher=user)
        subject_ids = subjects.values_list('id', flat=True)
        assignments = Assignment.objects.filter(subject__in=subject_ids)
        submissions = AssignmentSubmission.objects.filter(assignment__in=assignments)
        quiz_attempts = QuizAttempt.objects.filter(quiz__subject__in=subject_ids)

        subject_stats = []
        for subj in subjects:
            attempts = QuizAttempt.objects.filter(quiz__subject=subj)
            subject_stats.append({
                'id': str(subj.id),
                'name': subj.name,
                'code': subj.code,
                'materials_count': subj.materials.count(),
                'quiz_attempts': attempts.count(),
                'avg_quiz_score': attempts.aggregate(avg=Avg('score'))['avg'] or 0,
            })

        return Response({
            'subjects_count': subjects.count(),
            'assignments_count': assignments.count(),
            'submissions_count': submissions.count(),
            'pending_grading': submissions.filter(status='submitted').count(),
            'avg_quiz_score': quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0,
            'subject_stats': subject_stats,
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=403)

        from django.utils import timezone
        import datetime
        today = timezone.now().date()

        # Platform-wide stats
        total_users = User.objects.count()
        students = User.objects.filter(role='student').count()
        total_materials = StudyMaterial.objects.count()
        total_chat_sessions = get_collection('chat_sessions').count_documents({})
        ai_requests_today = AIUsageLog.objects.filter(created_at__date=today).count()

        # Users list with activity
        users = []
        for u in User.objects.filter(role='student').order_by('-created_at')[:100]:
            chat_count = get_collection('chat_sessions').count_documents({'user_id': str(u.id)})
            quiz_count = QuizAttempt.objects.filter(student=u).count()
            material_count = StudyMaterial.objects.filter(uploaded_by=u).count()
            users.append({
                'id': str(u.id),
                'email': u.email,
                'full_name': u.full_name,
                'is_verified': u.is_verified,
                'created_at': u.created_at,
                'chat_sessions': chat_count,
                'quizzes_taken': quiz_count,
                'materials_uploaded': material_count,
            })

        # Recent chat sessions across all users (for content history)
        recent_chats = list(
            get_collection('chat_sessions')
            .find({}, {'messages': {'$slice': -1}, '_id': 1, 'user_email': 1, 'title': 1, 'updated_at': 1, 'subject_name': 1})
            .sort('updated_at', -1)
            .limit(20)
        )
        for c in recent_chats:
            c['id'] = str(c.pop('_id'))
            if c.get('updated_at'):
                c['updated_at'] = c['updated_at'].isoformat()

        # Recent materials uploaded
        recent_materials = list(
            StudyMaterial.objects.order_by('-created_at')[:20]
            .values('id', 'title', 'material_type', 'uploaded_by__email', 'subject__name', 'created_at')
        )

        return Response({
            'stats': {
                'total_users': total_users,
                'students': students,
                'total_materials': total_materials,
                'total_chat_sessions': total_chat_sessions,
                'total_semesters': Semester.objects.count(),
                'total_subjects': Subject.objects.count(),
                'ai_requests_today': ai_requests_today,
            },
            'users_by_role': list(User.objects.values('role').annotate(count=Count('id'))),
            'materials_by_type': list(StudyMaterial.objects.values('material_type').annotate(count=Count('id'))),
            'users': users,
            'recent_chats': recent_chats,
            'recent_materials': recent_materials,
        })
