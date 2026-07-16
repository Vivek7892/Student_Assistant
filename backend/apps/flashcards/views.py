from django.utils import timezone
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Deck, Card, CardReview
from .serializers import DeckSerializer, CardSerializer, CardReviewSerializer
from .services.sm2 import sm2, next_review
from .tasks import generate_flashcards


class DeckViewSet(viewsets.ModelViewSet):
    serializer_class = DeckSerializer

    def get_queryset(self):
        return Deck.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def study(self, request, pk=None):
        deck = self.get_object()
        due = Card.objects.filter(
            deck=deck,
            reviews__user=request.user,
            reviews__next_review_at__lte=timezone.now(),
        ).distinct()
        # Also include cards with no review yet
        reviewed_ids = CardReview.objects.filter(
            user=request.user, card__deck=deck
        ).values_list('card_id', flat=True)
        new_cards = deck.cards.exclude(id__in=reviewed_ids)
        cards = list(due) + list(new_cards)
        return Response(CardSerializer(cards, many=True).data)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        deck = self.get_object()
        doc_id = request.data.get('document_id')
        text = request.data.get('text')
        task = generate_flashcards.delay(str(deck.id), text=text, document_id=doc_id)
        return Response({'task_id': task.id, 'status': 'queued'}, status=202)


class CardViewSet(viewsets.ModelViewSet):
    serializer_class = CardSerializer

    def get_queryset(self):
        return Card.objects.filter(
            deck__user=self.request.user,
            deck_id=self.kwargs['deck_pk'],
        )

    def perform_create(self, serializer):
        deck = Deck.objects.get(pk=self.kwargs['deck_pk'], user=self.request.user)
        serializer.save(deck=deck)


class CardReviewView(generics.GenericAPIView):
    def post(self, request, pk=None):
        card = Card.objects.get(pk=pk, deck__user=request.user)
        quality = int(request.data.get('quality', 0))
        if not 0 <= quality <= 5:
            return Response({'error': 'quality must be 0-5'}, status=400)

        review, _ = CardReview.objects.get_or_create(
            card=card, user=request.user,
            defaults={'ease_factor': 2.5, 'interval_days': 1, 'repetitions': 0},
        )
        ef, interval, reps = sm2(review.ease_factor, review.interval_days,
                                  review.repetitions, quality)
        history = review.quality_history + [quality]
        review.ease_factor = ef
        review.interval_days = interval
        review.repetitions = reps
        review.next_review_at = next_review(interval)
        review.last_reviewed_at = timezone.now()
        review.quality_history = history[-50:]  # keep last 50
        review.save()
        return Response(CardReviewSerializer(review).data)
