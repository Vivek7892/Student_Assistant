import json
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_flashcards(self, deck_id, text=None, document_id=None):
    from .models import Deck, Card
    try:
        deck = Deck.objects.get(id=deck_id)

        if document_id and not text:
            from apps.documents.models import DocumentEmbedding
            chunks = DocumentEmbedding.objects.filter(document_id=document_id)[:20]
            text = '\n'.join(c.chunk_text for c in chunks)

        if not text:
            return {'status': 'no_text'}

        from openai import OpenAI
        from django.conf import settings
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=[{
                'role': 'user',
                'content': (
                    'Generate 10 flashcards from this text. '
                    'Return JSON array: [{"question":"...","answer":"...","hint":"..."}]\n\n'
                    + text[:6000]
                )
            }],
        )
        raw = resp.choices[0].message.content
        start = raw.index('[')
        end = raw.rindex(']') + 1
        cards_data = json.loads(raw[start:end])

        Card.objects.bulk_create([
            Card(deck=deck, question=c['question'], answer=c['answer'], hint=c.get('hint', ''))
            for c in cards_data
        ])
        return {'status': 'done', 'count': len(cards_data)}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
