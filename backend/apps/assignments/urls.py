from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.AssignmentViewSet, basename='assignment')
router.register('submissions', views.SubmissionViewSet, basename='submission')

urlpatterns = [path('', include(router.urls))]
