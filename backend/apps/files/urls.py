from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileUploadView, FileViewSet, FileProxyView,
    DriveConnectView, DriveStatusView, DriveSyncView, DriveDisconnectView,
    UpdateStreakView, AwardXPView, CloudinaryCheckView,
)

router = DefaultRouter()
router.register('', FileViewSet, basename='file')

urlpatterns = [
    path('upload/',                FileUploadView.as_view(),      name='file-upload'),
    path('proxy/<uuid:material_id>/', FileProxyView.as_view(),    name='file-proxy'),
    path('cloudinary/check/',      CloudinaryCheckView.as_view(), name='cloudinary-check'),
    path('drive/connect/',         DriveConnectView.as_view(),    name='drive-connect'),
    path('drive/status/',          DriveStatusView.as_view(),     name='drive-status'),
    path('drive/sync/',            DriveSyncView.as_view(),       name='drive-sync'),
    path('drive/disconnect/',      DriveDisconnectView.as_view(), name='drive-disconnect'),
    path('streak/update/',         UpdateStreakView.as_view(),     name='streak-update'),
    path('xp/award/',              AwardXPView.as_view(),          name='xp-award'),
    path('', include(router.urls)),
]
