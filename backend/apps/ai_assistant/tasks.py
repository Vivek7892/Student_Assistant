import logging
import tempfile
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_document(self, material_id: str):
    import os
    from django.conf import settings as django_settings
    from apps.courses.models import StudyMaterial
    from .gemini_rag import gemini_rag as rag_pipeline, doc_processor

    try:
        material = StudyMaterial.objects.get(id=material_id)

        # Try local file first (avoids HTTP for local media)
        local_path = None
        media_url = getattr(django_settings, 'MEDIA_URL', '/media/')
        media_root = str(django_settings.MEDIA_ROOT)
        if material.file_url and media_url in material.file_url:
            rel = material.file_url.split(media_url, 1)[-1]
            candidate = os.path.join(media_root, rel)
            if os.path.exists(candidate):
                local_path = candidate

        if local_path is None:
            response = requests.get(material.file_url, timeout=60)
            response.raise_for_status()
            ext = f'.{material.file_type.lower()}'
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(response.content)
                local_path = tmp.name

        text = doc_processor.extract_text(local_path)
        collection_name = f'material_{material_id}'
        metadata = {
            'material_id': material_id,
            'subject_id': str(material.subject_id),
            'title': material.title,
        }
        chunks_count = rag_pipeline.index_document(text, collection_name, metadata)

        material.is_processed = True
        material.vector_collection_id = collection_name
        material.save(update_fields=['is_processed', 'vector_collection_id'])

        logger.info(f'Processed material {material_id}: {chunks_count} chunks indexed')
        return {'status': 'success', 'chunks': chunks_count}

    except Exception as exc:
        logger.error(f'Error processing material {material_id}: {exc}')
        raise self.retry(exc=exc, countdown=60)
