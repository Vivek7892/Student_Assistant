import numpy as np
from rest_framework import viewsets, generics, parsers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Folder, Document, DocumentEmbedding
from .serializers import FolderSerializer, DocumentSerializer, DocumentSummarySerializer
from .tasks import summarize_document, transcribe_audio


def _cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom else 0.0


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer

    def get_queryset(self):
        return Folder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        doc = serializer.save(user=self.request.user)
        if doc.file_type == 'audio':
            transcribe_audio.delay(str(doc.id))
        else:
            summarize_document.delay(str(doc.id))

    @action(detail=True, methods=['post'])
    def summarize(self, request, pk=None):
        doc = self.get_object()
        task = summarize_document.delay(str(doc.id))
        return Response({'task_id': task.id, 'status': 'queued'}, status=202)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        doc = self.get_object()
        try:
            return Response(DocumentSummarySerializer(doc.summary).data)
        except Exception:
            return Response({'error': 'No summary yet'}, status=404)

    @action(detail=True, methods=['post'])
    def ask(self, request, pk=None):
        doc = self.get_object()
        question = request.data.get('question', '')
        if not question:
            return Response({'error': 'question required'}, status=400)

        # Embed question
        try:
            from openai import OpenAI
            from django.conf import settings
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            q_emb = client.embeddings.create(
                model='text-embedding-3-small', input=[question]
            ).data[0].embedding
        except Exception:
            return Response({'error': 'Embedding service unavailable'}, status=503)

        # Top-k retrieval
        chunks = DocumentEmbedding.objects.filter(document=doc).exclude(embedding_json=[])
        scored = sorted(
            [(c, _cosine_sim(q_emb, c.embedding_json)) for c in chunks],
            key=lambda x: x[1], reverse=True
        )[:5]
        context = '\n\n'.join(f'[p{c.page_number}] {c.chunk_text}' for c, _ in scored)
        citations = [{'chunk_index': c.chunk_index, 'page': c.page_number} for c, _ in scored]

        # LLM answer
        try:
            resp = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {'role': 'system', 'content': 'Answer using only the provided context.'},
                    {'role': 'user', 'content': f'Context:\n{context}\n\nQuestion: {question}'},
                ],
            )
            answer = resp.choices[0].message.content
        except Exception as e:
            return Response({'error': str(e)}, status=503)

        return Response({'answer': answer, 'citations': citations})
