import json
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


def _extract_text(doc):
    """Extract text from document based on file type."""
    import io
    path = doc.file.path if hasattr(doc.file, 'path') else None

    if doc.file_type == 'pdf':
        try:
            import pdfplumber
            with pdfplumber.open(doc.file) as pdf:
                return '\n'.join(p.extract_text() or '' for p in pdf.pages)
        except Exception:
            pass
        try:
            from pypdf import PdfReader
            reader = PdfReader(doc.file)
            return '\n'.join(p.extract_text() or '' for p in reader.pages)
        except Exception:
            return ''
    elif doc.file_type == 'doc':
        try:
            from docx import Document as DocxDoc
            d = DocxDoc(doc.file)
            return '\n'.join(p.text for p in d.paragraphs)
        except Exception:
            return ''
    elif doc.file_type == 'image':
        try:
            import pytesseract
            from PIL import Image
            return pytesseract.image_to_string(Image.open(doc.file))
        except Exception:
            return ''
    return ''


def _chunk_text(text, size=512, overlap=64):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(' '.join(words[i:i + size]))
        i += size - overlap
    return chunks


def _embed(texts):
    """Embed texts using OpenAI text-embedding-3-small."""
    try:
        from openai import OpenAI
        from django.conf import settings
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        resp = client.embeddings.create(model='text-embedding-3-small', input=texts)
        return [item.embedding for item in resp.data]
    except Exception as e:
        logger.warning(f'Embedding failed: {e}')
        return [[] for _ in texts]


@shared_task(bind=True, max_retries=3)
def summarize_document(self, doc_id):
    from .models import Document, DocumentSummary, DocumentEmbedding
    try:
        doc = Document.objects.get(id=doc_id)
        text = _extract_text(doc)
        if not text.strip():
            return {'status': 'no_text'}

        chunks = _chunk_text(text)
        embeddings = _embed(chunks)

        DocumentEmbedding.objects.filter(document=doc).delete()
        DocumentEmbedding.objects.bulk_create([
            DocumentEmbedding(
                document=doc,
                chunk_index=i,
                chunk_text=chunk,
                embedding_json=emb,
            )
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ])

        # Generate summary
        try:
            from openai import OpenAI
            from django.conf import settings
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            excerpt = text[:8000]
            resp = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{
                    'role': 'user',
                    'content': (
                        f'Summarize this document in markdown. '
                        f'Also return 5 key points as a JSON array under "key_points".\n\n{excerpt}'
                    )
                }],
            )
            raw = resp.choices[0].message.content
            summary_md = raw
            key_points = []
            if 'key_points' in raw:
                try:
                    start = raw.index('[')
                    end = raw.rindex(']') + 1
                    key_points = json.loads(raw[start:end])
                    summary_md = raw[:start].strip()
                except Exception:
                    pass
        except Exception as e:
            summary_md = text[:2000]
            key_points = []

        DocumentSummary.objects.update_or_create(
            document=doc,
            defaults={'summary_md': summary_md, 'key_points': key_points},
        )
        return {'status': 'done', 'chunks': len(chunks)}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=2)
def transcribe_audio(self, doc_id):
    from .models import Document
    try:
        doc = Document.objects.get(id=doc_id)
        from openai import OpenAI
        from django.conf import settings
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        with doc.file.open('rb') as f:
            transcript = client.audio.transcriptions.create(model='whisper-1', file=f)
        # Store transcript as a text chunk for RAG
        from .models import DocumentEmbedding
        embeddings = _embed([transcript.text])
        DocumentEmbedding.objects.update_or_create(
            document=doc, chunk_index=0,
            defaults={'chunk_text': transcript.text, 'embedding_json': embeddings[0]},
        )
        return {'status': 'done'}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
