import os
import uuid
import mimetypes
import boto3
from botocore.config import Config
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from .models import UploadedFile

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.txt', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=f'https://{settings.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )


def get_public_url(storage_path: str) -> str:
    if settings.CLOUDFLARE_R2_PUBLIC_URL:
        return f"{settings.CLOUDFLARE_R2_PUBLIC_URL.rstrip('/')}/{storage_path}"
    # Fallback: generate presigned URL (for private buckets)
    client = get_r2_client()
    return client.generate_presigned_url(
        'get_object',
        Params={'Bucket': settings.CLOUDFLARE_R2_BUCKET_NAME, 'Key': storage_path},
        ExpiresIn=3600 * 24 * 7,  # 7 days
    )


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'uploaded_by', 'storage_path', 'public_url', 'mime_type', 'file_size']


class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': f'File type {ext} not allowed'}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > MAX_FILE_SIZE:
            return Response({'error': 'File size exceeds 50MB limit'}, status=status.HTTP_400_BAD_REQUEST)

        file_id = uuid.uuid4()
        storage_path = f"{request.user.id}/{file_id}{ext}"
        mime_type = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'

        # Upload to Cloudflare R2
        if settings.CLOUDFLARE_R2_ACCOUNT_ID:
            try:
                client = get_r2_client()
                client.upload_fileobj(
                    file,
                    settings.CLOUDFLARE_R2_BUCKET_NAME,
                    storage_path,
                    ExtraArgs={'ContentType': mime_type},
                )
                public_url = get_public_url(storage_path)
            except Exception as e:
                return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Local fallback: save to MEDIA_ROOT
            from django.core.files.storage import default_storage
            saved_path = default_storage.save(storage_path, file)
            public_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        uploaded_file = UploadedFile.objects.create(
            id=file_id,
            uploaded_by=request.user,
            original_name=file.name,
            storage_path=storage_path,
            public_url=public_url,
            file_size=file.size,
            mime_type=mime_type,
            category=request.data.get('category', 'other'),
            semester_id=request.data.get('semester_id') or None,
            subject_id=request.data.get('subject_id') or None,
        )
        return Response(UploadedFileSerializer(uploaded_file).data, status=status.HTTP_201_CREATED)


class FileViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedFileSerializer

    def get_queryset(self):
        return UploadedFile.objects.filter(uploaded_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        file_obj = self.get_object()
        if settings.CLOUDFLARE_R2_ACCOUNT_ID:
            try:
                client = get_r2_client()
                client.delete_object(
                    Bucket=settings.CLOUDFLARE_R2_BUCKET_NAME,
                    Key=file_obj.storage_path,
                )
            except Exception:
                pass
        else:
            from django.core.files.storage import default_storage
            if default_storage.exists(file_obj.storage_path):
                default_storage.delete(file_obj.storage_path)
        file_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
