from django.urls import path
from . import views

urlpatterns = [
    path('student/', views.StudentAnalyticsView.as_view(), name='student-analytics'),
    path('teacher/', views.TeacherAnalyticsView.as_view(), name='teacher-analytics'),
    path('admin/', views.AdminAnalyticsView.as_view(), name='admin-analytics'),
]
