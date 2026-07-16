from rest_framework import serializers
from .models import Deck, Card, CardReview


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = ['id', 'question', 'answer', 'hint', 'created_at']
        read_only_fields = ['id', 'created_at']


class CardReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardReview
        fields = ['ease_factor', 'interval_days', 'repetitions',
                  'next_review_at', 'last_reviewed_at', 'quality_history']


class DeckSerializer(serializers.ModelSerializer):
    card_count = serializers.SerializerMethodField()

    class Meta:
        model = Deck
        fields = ['id', 'name', 'subject_ref', 'color', 'source_document_id',
                  'created_at', 'updated_at', 'card_count']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_card_count(self, obj):
        return obj.cards.count()
