import uuid
from django.db import models
from django.utils import timezone
from apps.accounts.models import User


class Deck(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='decks')
    name = models.CharField(max_length=200)
    subject_ref = models.CharField(max_length=200, blank=True)  # loose ref to subject name
    color = models.CharField(max_length=7, default='#6366f1')
    source_document_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flashcard_decks'
        ordering = ['-created_at']


class Card(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='cards')
    question = models.TextField()
    answer = models.TextField()
    hint = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'flashcard_cards'
        ordering = ['created_at']


class CardReview(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='card_reviews')
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.PositiveIntegerField(default=1)
    repetitions = models.PositiveIntegerField(default=0)
    next_review_at = models.DateTimeField(default=timezone.now)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)
    quality_history = models.JSONField(default=list)

    class Meta:
        db_table = 'card_reviews'
        unique_together = ['card', 'user']
