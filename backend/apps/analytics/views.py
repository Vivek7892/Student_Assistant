import datetime
from django.utils import timezone
from django.db.models import Count, Avg, Sum, F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from apps.accounts.models import User
from apps.courses.models import Semester, Subject, StudyMaterial, PlannerTask
from apps.ai_assistant.models import QuizAttempt, AIUsageLog
from apps.assignments.models import Assignment, AssignmentSubmission
from apps.analytics.models import DailyActivity, SubjectMastery
from core.mongo import get_collection


class StudentAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        start_365 = today - datetime.timedelta(days=364)

        # ── Core stats ────────────────────────────────────────────────────────
        quiz_attempts = QuizAttempt.objects.filter(student=user).order_by('completed_at')
        quiz_stats = quiz_attempts.aggregate(total=Count('id'), avg_score=Avg('score'))
        submissions = AssignmentSubmission.objects.filter(student=user)
        profile = getattr(user, 'student_profile', None)
        materials = StudyMaterial.objects.filter(uploaded_by=user)
        planner_tasks = PlannerTask.objects.filter(user=user)

        # Total study minutes from DailyActivity
        study_agg = DailyActivity.objects.filter(user=user).aggregate(
            total_minutes=Sum('study_minutes')
        )
        total_study_hours = round((study_agg['total_minutes'] or 0) / 60, 1)

        # AI sessions and Watch Later count from MongoDB
        try:
            chat_sessions_count = get_collection('chat_sessions').count_documents(
                {'user_id': str(user.id)}
            )
        except Exception:
            chat_sessions_count = 0
        try:
            saved_videos_count = get_collection('videos_v2').count_documents(
                {'user_id': str(user.id)}
            )
            favorite_videos_count = get_collection('videos_v2').count_documents(
                {'user_id': str(user.id), 'favorite': True}
            )
        except Exception:
            saved_videos_count = 0
            favorite_videos_count = 0

        # ── Activity heatmap (last 365 days from DailyActivity) ───────────────
        activities = DailyActivity.objects.filter(
            user=user, date__gte=start_365
        ).values('date', 'ai_sessions', 'quiz_attempts', 'flashcard_reviews', 'documents_uploaded')

        activity_map: dict[str, int] = {}
        for a in activities:
            key = a['date'].isoformat()
            total = (
                a['ai_sessions'] + a['quiz_attempts'] +
                a['flashcard_reviews'] + a['documents_uploaded']
            )
            activity_map[key] = total

        # ── Streak calculation from DailyActivity ─────────────────────────────
        active_dates = {datetime.date.fromisoformat(key) for key, count in activity_map.items() if count > 0}
        streak = 0
        cursor = today
        if cursor not in active_dates and (cursor - datetime.timedelta(days=1)) in active_dates:
            cursor = cursor - datetime.timedelta(days=1)
        while cursor in active_dates:
            streak += 1
            cursor = cursor - datetime.timedelta(days=1)
        if streak == 0:
            streak = getattr(profile, 'streak', 0)
        longest_streak = 0
        cur_streak = 0
        prev = None
        for d in sorted(active_dates):
            if prev and (d - prev).days == 1:
                cur_streak += 1
            else:
                cur_streak = 1
            longest_streak = max(longest_streak, cur_streak)
            prev = d

        # ── Weekly activity (last 7 days) ─────────────────────────────────────
        weekly_activity = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            key = d.isoformat()
            weekly_activity.append({
                'day': d.strftime('%a'),
                'sessions': activity_map.get(key, 0),
            })

        # ── Quiz history ──────────────────────────────────────────────────────
        quiz_history = [
            {
                'date': a.completed_at.strftime('%b %d') if a.completed_at else '',
                'score': round(a.score or 0),
                'title': getattr(a.quiz, 'title', '') if a.quiz else '',
                'questions': len(getattr(a.quiz, 'questions', [])) if a.quiz else 0,
            }
            for a in quiz_attempts
        ]

        # ── Subject mastery from SubjectMastery table ─────────────────────────
        masteries = SubjectMastery.objects.filter(user=user).select_related('subject')
        subject_mastery = [
            {'subject': m.subject.name, 'score': round(m.avg_score)}
            for m in masteries
        ]

        # ── Monthly progress (last 6 months) ──────────────────────────────────
        monthly_progress = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - datetime.timedelta(days=i * 28)).replace(day=1)
            month_end = (month_start + datetime.timedelta(days=32)).replace(day=1)
            month_attempts = quiz_attempts.filter(
                completed_at__date__gte=month_start,
                completed_at__date__lt=month_end,
            )
            avg = month_attempts.aggregate(avg=Avg('score'))['avg'] or 0
            monthly_progress.append({
                'month': month_start.strftime('%b'),
                'score': round(avg),
            })

        total_active_events = sum(activity_map.values())
        completed_tasks = planner_tasks.filter(done=True).count()
        total_tasks = planner_tasks.count()
        task_completion = round((completed_tasks / total_tasks) * 100) if total_tasks else 0
        indexed_docs = materials.filter(is_processed=True).count()
        document_health = round((indexed_docs / materials.count()) * 100) if materials.exists() else 0
        quiz_health = min(100, round(quiz_stats['avg_score'] or 0))
        activity_health = min(100, round((len(active_dates) / 30) * 100))
        ai_health = min(100, chat_sessions_count * 10)
        health_score = round((quiz_health * 0.35) + (activity_health * 0.25) + (task_completion * 0.2) + (document_health * 0.1) + (ai_health * 0.1))

        activity_mix = [
            {'name': 'AI', 'value': sum(a.get('ai_sessions', 0) for a in activities)},
            {'name': 'Quizzes', 'value': sum(a.get('quiz_attempts', 0) for a in activities)},
            {'name': 'Flashcards', 'value': sum(a.get('flashcard_reviews', 0) for a in activities)},
            {'name': 'Documents', 'value': sum(a.get('documents_uploaded', 0) for a in activities)},
        ]

        recent_activity = []
        for d in sorted(active_dates, reverse=True)[:10]:
            count = activity_map.get(d.isoformat(), 0)
            recent_activity.append({
                'date': d.strftime('%b %d'),
                'events': count,
                'label': 'Study activity',
            })

        insights = []
        if streak >= 7:
            insights.append({'title': 'Streak strong', 'body': f'You are on a {streak}-day streak. Keep today light if you need to, but keep the chain alive.', 'color': 'amber'})
        elif streak > 0:
            insights.append({'title': 'Streak started', 'body': f'{streak} active day{"s" if streak != 1 else ""} in a row. Aim for 7 to build momentum.', 'color': 'primary'})
        else:
            insights.append({'title': 'Restart momentum', 'body': 'One short study session today will restart your streak.', 'color': 'rose'})
        if quiz_health and quiz_health < 70:
            insights.append({'title': 'Quiz focus', 'body': 'Average quiz score is below 70%. Review weak subjects before adding new material.', 'color': 'amber'})
        if materials.count() and document_health < 100:
            insights.append({'title': 'Document indexing', 'body': 'Some documents are still not indexed for AI study support.', 'color': 'cyan'})

        return Response({
            'total_study_hours': total_study_hours,
            'avg_quiz_score': round(quiz_stats['avg_score'] or 0),
            'streak': streak,
            'longest_streak': longest_streak,
            'total_sessions': chat_sessions_count,
            'health_score': health_score,
            'activity_health': activity_health,
            'task_completion': task_completion,
            'document_health': document_health,
            'quiz_health': quiz_health,
            'quiz_history': quiz_history,
            'activity_map': activity_map,
            'weekly_activity': weekly_activity,
            'subject_mastery': subject_mastery,
            'monthly_progress': monthly_progress,
            'activity_mix': activity_mix,
            'recent_activity': recent_activity,
            'insights': insights,
            'submissions_count': submissions.count(),
            'documents_count': materials.count(),
            'indexed_documents': indexed_docs,
            'planner_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'saved_videos': saved_videos_count,
            'favorite_videos': favorite_videos_count,
            'active_days': len(active_dates),
            'total_active_events': total_active_events,
            'streak_dashboard': {
                'current': streak,
                'longest': longest_streak,
                'active_days': len(active_dates),
                'today_active': today in active_dates,
                'weekly_goal': 5,
                'weekly_active_days': len([d for d in active_dates if d >= today - datetime.timedelta(days=6)]),
            },
            'xp': getattr(profile, 'xp', 0),
            'level': getattr(profile, 'level', 1),
        })


class TeacherAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
                'avg_quiz_score': round(attempts.aggregate(avg=Avg('score'))['avg'] or 0),
            })

        return Response({
            'subjects_count': subjects.count(),
            'assignments_count': assignments.count(),
            'submissions_count': submissions.count(),
            'pending_grading': submissions.filter(status='submitted').count(),
            'avg_quiz_score': round(quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0),
            'subject_stats': subject_stats,
        })


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=403)

        today = timezone.now().date()

        total_users = User.objects.count()
        students = User.objects.filter(role='student').count()
        total_materials = StudyMaterial.objects.count()
        total_chat_sessions = get_collection('chat_sessions').count_documents({})
        ai_requests_today = AIUsageLog.objects.filter(created_at__date=today).count()

        # Platform-wide daily activity (last 30 days)
        start_30 = today - datetime.timedelta(days=29)
        platform_activity = list(
            DailyActivity.objects.filter(date__gte=start_30)
            .values('date')
            .annotate(
                total_sessions=Sum('ai_sessions'),
                total_quizzes=Sum('quiz_attempts'),
            )
            .order_by('date')
        )
        for row in platform_activity:
            row['date'] = row['date'].isoformat()

        # Users list with activity
        users = []
        for u in User.objects.filter(role='student').order_by('-created_at')[:100]:
            chat_count = get_collection('chat_sessions').count_documents({'user_id': str(u.id)})
            quiz_count = QuizAttempt.objects.filter(student=u).count()
            material_count = StudyMaterial.objects.filter(uploaded_by=u).count()
            profile = getattr(u, 'student_profile', None)
            users.append({
                'id': str(u.id),
                'email': u.email,
                'full_name': u.full_name,
                'is_verified': u.is_verified,
                'created_at': u.created_at,
                'chat_sessions': chat_count,
                'quizzes_taken': quiz_count,
                'materials_uploaded': material_count,
                'streak': getattr(profile, 'streak', 0),
                'xp': getattr(profile, 'xp', 0),
                'level': getattr(profile, 'level', 1),
            })

        # Recent chat sessions
        recent_chats = list(
            get_collection('chat_sessions')
            .find({}, {'messages': {'$slice': -1}, '_id': 1, 'user_email': 1,
                       'title': 1, 'updated_at': 1, 'subject_name': 1})
            .sort('updated_at', -1)
            .limit(20)
        )
        for c in recent_chats:
            c['id'] = str(c.pop('_id'))
            if c.get('updated_at'):
                c['updated_at'] = c['updated_at'].isoformat()

        recent_materials = list(
            StudyMaterial.objects.order_by('-created_at')[:20]
            .values('id', 'title', 'material_type', 'uploaded_by__email',
                    'subject__name', 'created_at')
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
            'materials_by_type': list(
                StudyMaterial.objects.values('material_type').annotate(count=Count('id'))
            ),
            'platform_activity': platform_activity,
            'users': users,
            'recent_chats': recent_chats,
            'recent_materials': recent_materials,
        })
