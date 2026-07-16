from django.urls import path, include
from rest_framework_nested import routers
from .views import DeckViewSet, CardViewSet, CardReviewView

router = routers.SimpleRouter()
router.register('decks', DeckViewSet, basename='deck')

cards_router = routers.NestedSimpleRouter(router, 'decks', lookup='deck')
cards_router.register('cards', CardViewSet, basename='deck-card')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(cards_router.urls)),
    path('cards/<uuid:pk>/review/', CardReviewView.as_view(), name='card-review'),
]
