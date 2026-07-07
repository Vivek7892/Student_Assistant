from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('semesters', views.SemesterViewSet)
router.register('subjects', views.SubjectViewSet)
router.register('materials', views.StudyMaterialViewSet, basename='material')
router.register('resources', views.LearningResourceViewSet)
router.register('youtube', views.YouTubeResourceViewSet, basename='youtube')
router.register('planner', views.PlannerTaskViewSet, basename='planner')

urlpatterns = [path('', include(router.urls))]
