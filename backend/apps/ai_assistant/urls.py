from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('quizzes', views.QuizViewSet, basename='quiz')
router.register('flashcards', views.FlashcardViewSet, basename='flashcard')
router.register('study-plans', views.StudyPlanViewSet, basename='study-plan')

urlpatterns = [
    path('', include(router.urls)),
    # chat must come before <str:pk>/ to avoid conflict
    path('sessions/chat/', views.ChatSessionViewSet.as_view({'post': 'chat'}), name='chat'),
    path('sessions/', views.ChatSessionViewSet.as_view({'get': 'list'}), name='chat-session-list'),
    path('sessions/<str:pk>/', views.ChatSessionViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='chat-session-detail'),
    path('summarize/', views.SummarizeView.as_view({'post': 'summarize'}), name='summarize'),
]
