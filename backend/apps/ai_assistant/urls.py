from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('sessions', views.ChatSessionViewSet, basename='chat-session')
router.register('quizzes', views.QuizViewSet, basename='quiz')
router.register('flashcards', views.FlashcardViewSet, basename='flashcard')
router.register('study-plans', views.StudyPlanViewSet, basename='study-plan')

urlpatterns = [
    path('', include(router.urls)),
    path('summarize/', views.SummarizeView.as_view({'post': 'summarize'})),
]
