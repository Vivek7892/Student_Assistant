from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileUploadView, FileViewSet

router = DefaultRouter()
router.register('', FileViewSet, basename='file')

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('', include(router.urls)),
]
