from django.urls import path
from .views import (
    VideoListView, VideoDetailView,
    YouTubeSearchView, YouTubeFetchView,
    FolderListView, FolderDetailView,
)

urlpatterns = [
    path('',                  VideoListView.as_view()),
    path('search/',           YouTubeSearchView.as_view()),
    path('fetch/',            YouTubeFetchView.as_view()),
    path('folders/',          FolderListView.as_view()),
    path('folders/<str:fid>/', FolderDetailView.as_view()),
    path('<str:vid>/',        VideoDetailView.as_view()),
]
