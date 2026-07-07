from django.urls import path
from .views import VideoListView, VideoDetailView

urlpatterns = [
    path('', VideoListView.as_view()),
    path('<str:vid>/', VideoDetailView.as_view()),
]
