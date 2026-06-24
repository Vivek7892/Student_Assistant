from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('semesters', views.SemesterViewSet)
router.register('subjects', views.SubjectViewSet)
router.register('materials', views.StudyMaterialViewSet)
router.register('resources', views.LearningResourceViewSet)

urlpatterns = [path('', include(router.urls))]
