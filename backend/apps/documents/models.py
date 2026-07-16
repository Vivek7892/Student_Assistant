import uuid
from django.db import models
from apps.accounts.models import User


class Folder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doc_folders')
    name = models.CharField(max_length=200)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='children')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_folders'
        ordering = ['name']


class Document(models.Model):
    class FileType(models.TextChoices):
        PDF = 'pdf', 'PDF'
        DOC = 'doc', 'Document'
        AUDIO = 'audio', 'Audio'
        IMAGE = 'image', 'Image'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='documents')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=10, choices=FileType.choices, default=FileType.OTHER)
    size_bytes = models.BigIntegerField(default=0)
    mime = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-uploaded_at']


class DocumentSummary(models.Model):
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name='summary')
    summary_md = models.TextField()
    key_points = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    model_used = models.CharField(max_length=100, default='gpt-4o-mini')

    class Meta:
        db_table = 'document_summaries'


class DocumentEmbedding(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='embeddings')
    chunk_index = models.PositiveIntegerField()
    chunk_text = models.TextField()
    page_number = models.PositiveIntegerField(null=True, blank=True)
    # embedding stored as JSON array (pgvector migration adds vector column separately)
    embedding_json = models.JSONField(default=list)

    class Meta:
        db_table = 'document_embeddings'
        ordering = ['chunk_index']
