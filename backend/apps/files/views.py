import os
import uuid
import mimetypes
import requests
from urllib.parse import urlparse
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.utils.text import get_valid_filename
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, serializers, viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from .models import UploadedFile, GoogleDriveToken

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

GOOGLE_DRIVE_CLIENT_ID     = getattr(settings, 'GOOGLE_CLIENT_ID', '')
GOOGLE_DRIVE_CLIENT_SECRET = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
GOOGLE_TOKEN_URL           = 'https://oauth2.googleapis.com/token'
GOOGLE_DRIVE_FILES_URL     = 'https://www.googleapis.com/drive/v3/files'
GOOGLE_DRIVE_UPLOAD_URL    = 'https://www.googleapis.com/upload/drive/v3/files'
DRIVE_FOLDER_NAME          = 'Student_Assistant'

DRIVE_MIME_MAP = {
    '.pdf':  'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt':  'text/plain',
}

CLOUDINARY_RESOURCE_TYPE = {
    '.pdf':  'raw',
    '.docx': 'raw',
    '.pptx': 'raw',
    '.txt':  'raw',
    '.jpg':  'image',
    '.jpeg': 'image',
    '.png':  'image',
    '.gif':  'image',
    '.webp': 'image',
    '.mp4':  'video',
    '.mov':  'video',
    '.avi':  'video',
    '.mp3':  'raw',
    '.wav':  'raw',
}

def _cloudinary_configured() -> bool:
    cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
    return bool(cloud_name and cloud_name != 'your-cloud-name')


def _cloudinary_inline_url(url: str, resource_type: str) -> str:
    """Return a Cloudinary URL suitable for in-browser document preview."""
    if not url or resource_type != 'raw' or '/upload/' not in url:
        return url
    url = url.replace('fl_attachment:false,fl_inline/', 'fl_inline/')
    if '/upload/fl_inline/' in url:
        return url
    return url.replace('/upload/', '/upload/fl_inline/', 1)


def _cloudinary_public_id_from_url(url: str, ext: str = '') -> str:
    """
    Extract Cloudinary public_id from a delivery URL.
    Handles URLs that include transformations such as fl_inline before /v123/.
    """
    if not url or 'cloudinary.com' not in url:
        return ''
    try:
        parts = [p for p in urlparse(url).path.split('/') if p]
        upload_idx = parts.index('upload')
        public_parts = parts[upload_idx + 1:]
        transform_prefixes = ('a_', 'b_', 'c_', 'd_', 'e_', 'f_', 'fl_', 'g_', 'h_', 'l_', 'q_', 'r_', 't_', 'w_', 'x_', 'y_', 'z_')
        while public_parts and (
            ',' in public_parts[0]
            or ':' in public_parts[0]
            or public_parts[0].startswith(transform_prefixes)
        ):
            public_parts = public_parts[1:]
        if public_parts and public_parts[0].startswith('v') and public_parts[0][1:].isdigit():
            public_parts = public_parts[1:]
        public_id = '/'.join(public_parts)
        resource_type = CLOUDINARY_RESOURCE_TYPE.get(ext.lower(), 'raw')
        if resource_type != 'raw' and '.' in public_id:
            public_id = public_id.rsplit('.', 1)[0]
        return public_id
    except Exception:
        return ''


def _upload_to_cloudinary(file_content: bytes, file_name: str, ext: str, folder: str = 'student_assistant') -> dict | None:
    """
    Upload bytes to Cloudinary. Returns Cloudinary metadata or None on failure.
    Uses 'raw' resource_type for documents, 'image'/'video' for media.
    """
    if not _cloudinary_configured():
        return None
    try:
        import cloudinary.uploader
        import io
        resource_type = CLOUDINARY_RESOURCE_TYPE.get(ext.lower(), 'raw')
        public_id = f"{folder}/{uuid.uuid4().hex}_{os.path.splitext(file_name)[0]}{ext}"
        result = cloudinary.uploader.upload(
            io.BytesIO(file_content),
            public_id=public_id,
            resource_type=resource_type,
            use_filename=False,
            overwrite=False,
        )
        url = _cloudinary_inline_url(result.get('secure_url') or '', resource_type)
        return {
            'url': url,
            'public_id': result.get('public_id') or public_id,
            'resource_type': resource_type,
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f'[Cloudinary] upload failed: {e}')
        return None


def _delete_from_cloudinary(public_id: str, ext: str):
    """Delete a Cloudinary asset by public_id."""
    if not _cloudinary_configured() or not public_id:
        return
    try:
        import cloudinary.uploader
        resource_type = CLOUDINARY_RESOURCE_TYPE.get(ext.lower(), 'raw')
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception:
        pass


def delete_cloudinary_file(public_url: str, file_name: str = ''):
    """Best-effort delete for a Cloudinary-backed uploaded document."""
    ext = os.path.splitext(file_name or urlparse(public_url).path)[1].lower()
    public_id = _cloudinary_public_id_from_url(public_url, ext)
    _delete_from_cloudinary(public_id, ext)


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'uploaded_by', 'storage_path', 'public_url', 'mime_type', 'file_size']


# ── Drive helpers ─────────────────────────────────────────────────────────────

def _get_valid_access_token(token_obj: GoogleDriveToken) -> str:
    """Refresh the access token if expired, return valid token."""
    from datetime import timedelta
    if token_obj.token_expiry and token_obj.token_expiry > timezone.now() + timedelta(minutes=2):
        return token_obj.access_token
    if not token_obj.refresh_token:
        return ''
    resp = requests.post(GOOGLE_TOKEN_URL, data={
        'client_id':     GOOGLE_DRIVE_CLIENT_ID,
        'client_secret': GOOGLE_DRIVE_CLIENT_SECRET,
        'refresh_token': token_obj.refresh_token,
        'grant_type':    'refresh_token',
    }, timeout=10)
    if resp.status_code != 200:
        return ''
    data = resp.json()
    from datetime import timedelta
    token_obj.access_token = data.get('access_token', token_obj.access_token)
    if data.get('expires_in'):
        token_obj.token_expiry = timezone.now() + timedelta(seconds=data['expires_in'])
    token_obj.save(update_fields=['access_token', 'token_expiry'])
    return token_obj.access_token


def _get_or_create_drive_folder(access_token: str, folder_name: str = DRIVE_FOLDER_NAME) -> str:
    """
    Find or create a folder named `folder_name` in the user's Drive root.
    Returns the folder ID.
    """
    headers = {'Authorization': f'Bearer {access_token}'}

    # Search for existing folder
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    resp = requests.get(
        GOOGLE_DRIVE_FILES_URL,
        headers=headers,
        params={'q': query, 'fields': 'files(id,name)', 'pageSize': 1},
        timeout=10,
    )
    if resp.status_code == 200:
        files = resp.json().get('files', [])
        if files:
            return files[0]['id']

    # Create the folder
    resp = requests.post(
        GOOGLE_DRIVE_FILES_URL,
        headers={**headers, 'Content-Type': 'application/json'},
        json={
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
        },
        timeout=10,
    )
    if resp.status_code in (200, 201):
        return resp.json().get('id', '')
    return ''


def _upload_to_drive(access_token: str, folder_id: str, file_content: bytes,
                     file_name: str, mime_type: str) -> dict:
    """
    Upload a file to a specific Drive folder using multipart upload.
    Returns {'id': ..., 'webViewLink': ..., 'webContentLink': ...} or {}.
    """
    import json as _json
    headers = {'Authorization': f'Bearer {access_token}'}

    metadata = _json.dumps({
        'name': file_name,
        'parents': [folder_id],
    }).encode()

    boundary = 'boundary_student_assistant'
    body = (
        f'--{boundary}\r\n'
        f'Content-Type: application/json; charset=UTF-8\r\n\r\n'
    ).encode() + metadata + (
        f'\r\n--{boundary}\r\n'
        f'Content-Type: {mime_type}\r\n\r\n'
    ).encode() + file_content + f'\r\n--{boundary}--'.encode()

    resp = requests.post(
        f'{GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink,webContentLink',
        headers={**headers, 'Content-Type': f'multipart/related; boundary={boundary}'},
        data=body,
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return resp.json()
    return {}


def _make_drive_file_public(access_token: str, file_id: str):
    """Set a Drive file to 'anyone with link can read'."""
    requests.post(
        f'{GOOGLE_DRIVE_FILES_URL}/{file_id}/permissions',
        headers={'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'},
        json={'role': 'reader', 'type': 'anyone'},
        timeout=10,
    )


# ── Sync document processor (no Celery/Redis needed) ─────────────────────────

def _local_path_for(file_url: str) -> str | None:
    """Convert a local media URL to an absolute filesystem path, or None."""
    media_url  = getattr(settings, 'MEDIA_URL', '/media/')
    media_root = str(settings.MEDIA_ROOT)
    if file_url and media_url in file_url:
        rel = file_url.split(media_url, 1)[-1]
        candidate = os.path.join(media_root, rel)
        if os.path.exists(candidate):
            return candidate
    return None


def _process_material_sync(material, local_file_path: str | None = None):
    """Index a StudyMaterial into ChromaDB synchronously (no Celery required)."""
    import logging
    import tempfile
    import requests as _req
    from apps.ai_assistant.gemini_rag import gemini_rag as rag, doc_processor
    logger = logging.getLogger(__name__)
    try:
        path = local_file_path
        if path is None:
            resp = _req.get(material.file_url, timeout=60)
            resp.raise_for_status()
            ext = f'.{material.file_type.lower()}'
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp.write(resp.content)
                path = tmp.name
        text             = doc_processor.extract_text(path)
        collection_name  = f'material_{material.id}'
        rag.index_document(text, collection_name, {
            'material_id': str(material.id),
            'title':       material.title,
        })
        material.is_processed        = True
        material.vector_collection_id = collection_name
        material.save(update_fields=['is_processed', 'vector_collection_id'])
    except Exception as exc:
        logger.warning(f'[sync processor] material {material.id}: {exc}')


# ── File Upload ───────────────────────────────────────────────────────────────

class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({'error': f'File type {ext} not allowed. Use PDF, DOCX, PPTX or TXT.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > MAX_FILE_SIZE:
            return Response({'error': 'File exceeds 50MB limit'}, status=status.HTTP_400_BAD_REQUEST)

        file_id      = uuid.uuid4()
        storage_path = f'uploads/{request.user.id}/{file_id}{ext}'
        mime_type    = DRIVE_MIME_MAP.get(ext) or mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        file_content = file.read()

        public_url    = None
        drive_file_id = None
        storage_used  = 'local'

        # ── 1. Try Cloudinary first ───────────────────────────────────────────
        cloudinary_upload = _upload_to_cloudinary(
            file_content, file.name, ext,
            folder=f'student_assistant/{request.user.id}'
        )
        if cloudinary_upload:
            public_url   = cloudinary_upload['url']
            storage_used = 'cloudinary'

        # ── 2. Try Drive if connected and Cloudinary not used ─────────────────
        if public_url is None:
            try:
                token_obj    = GoogleDriveToken.objects.get(user=request.user)
                access_token = _get_valid_access_token(token_obj)
                if access_token:
                    if not token_obj.drive_folder_id:
                        folder_id = _get_or_create_drive_folder(access_token)
                        token_obj.drive_folder_id = folder_id
                        token_obj.save(update_fields=['drive_folder_id'])
                    else:
                        folder_id = token_obj.drive_folder_id
                    if folder_id:
                        drive_result = _upload_to_drive(access_token, folder_id, file_content, file.name, mime_type)
                        if drive_result.get('id'):
                            drive_file_id = drive_result['id']
                            _make_drive_file_public(access_token, drive_file_id)
                            public_url   = f'https://drive.google.com/uc?export=download&id={drive_file_id}'
                            storage_used = 'drive'
            except GoogleDriveToken.DoesNotExist:
                pass
            except Exception:
                pass

        # ── 3. Fall back to R2 / local ────────────────────────────────────────
        if public_url is None:
            from io import BytesIO
            public_url = _store_file(request, BytesIO(file_content), storage_path, mime_type)
            if public_url is None:
                return Response({'error': 'Upload failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        uploaded = UploadedFile.objects.create(
            id=file_id,
            uploaded_by=request.user,
            original_name=file.name,
            storage_path=cloudinary_upload['public_id'] if storage_used == 'cloudinary' and cloudinary_upload else storage_path,
            public_url=public_url,
            file_size=len(file_content),
            mime_type=mime_type,
            category='study_material',
            subject_id=request.data.get('subject_id') or None,
            semester_id=request.data.get('semester_id') or None,
        )

        from apps.courses.models import StudyMaterial
        title    = request.data.get('title') or file.name.rsplit('.', 1)[0]
        material = StudyMaterial.objects.create(
            title=title,
            file_url=public_url,
            file_name=file.name,
            file_size=len(file_content),
            file_type=ext.lstrip('.'),
            material_type='notes',
            uploaded_by=request.user,
            subject_id=request.data.get('subject_id') or None,
            drive_file_id=drive_file_id or '',
        )

        uploaded.material = material
        uploaded.save(update_fields=['material'])

        _process_material_sync(material, local_file_path=_local_path_for(public_url))

        # Update MongoDB pdf_metadata with real material_id
        if storage_used == 'cloudinary':
            try:
                from core.mongo import store_pdf_metadata
                store_pdf_metadata(
                    material_id=str(material.id),
                    user_id=str(request.user.id),
                    cloudinary_url=public_url,
                    public_id=cloudinary_upload['public_id'] if cloudinary_upload else '',
                    file_name=file.name,
                    file_size=len(file_content),
                )
            except Exception:
                pass

        try:
            from core.activity import record_activity
            record_activity(request.user, 'document_upload')
        except Exception:
            pass

        return Response({
            'id':          str(uploaded.id),
            'material_id': str(material.id),
            'url':         public_url,
            'name':        file.name,
            'size':        len(file_content),
            'drive':       bool(drive_file_id),
            'storage':     storage_used,
        }, status=status.HTTP_201_CREATED)


def _store_file(request, file_obj, storage_path, mime_type):
    """Store file in R2 or local storage. Returns public_url or None on error."""
    r2_id  = getattr(settings, 'CLOUDFLARE_R2_ACCOUNT_ID', '')
    use_r2 = r2_id and r2_id != 'your-cloudflare-account-id'

    if use_r2:
        try:
            import boto3
            from botocore.config import Config
            client = boto3.client(
                's3',
                endpoint_url=f'https://{r2_id}.r2.cloudflarestorage.com',
                aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
                config=Config(signature_version='s3v4'),
                region_name='auto',
            )
            client.upload_fileobj(file_obj, settings.CLOUDFLARE_R2_BUCKET_NAME, storage_path,
                                  ExtraArgs={'ContentType': mime_type})
            pub = getattr(settings, 'CLOUDFLARE_R2_PUBLIC_URL', '')
            return f"{pub.rstrip('/')}/{storage_path}" if pub else request.build_absolute_uri(f'/media/{storage_path}')
        except Exception:
            return None
    else:
        file_obj.seek(0)
        saved = default_storage.save(storage_path, file_obj)
        return request.build_absolute_uri(settings.MEDIA_URL + saved)


# ── Google Drive OAuth ────────────────────────────────────────────────────────

class DriveConnectView(APIView):
    """
    POST { code, redirect_uri }
    Exchange OAuth code → tokens, store them, create Student_Assistant folder.
    """
    def post(self, request):
        code         = request.data.get('code', '').strip()
        redirect_uri = request.data.get('redirect_uri', '').strip()
        if not code:
            return Response({'error': 'Missing authorization code'}, status=400)

        resp = requests.post(GOOGLE_TOKEN_URL, data={
            'code':          code,
            'client_id':     GOOGLE_DRIVE_CLIENT_ID,
            'client_secret': GOOGLE_DRIVE_CLIENT_SECRET,
            'redirect_uri':  redirect_uri,
            'grant_type':    'authorization_code',
        }, timeout=10)

        if resp.status_code != 200:
            return Response({'error': 'Failed to exchange code', 'detail': resp.text}, status=400)

        token_data = resp.json()
        expiry = None
        if token_data.get('expires_in'):
            from datetime import timedelta
            expiry = timezone.now() + timedelta(seconds=token_data['expires_in'])

        access_token  = token_data.get('access_token', '')
        refresh_token = token_data.get('refresh_token', '')

        # Create the Student_Assistant folder in Drive
        folder_id = ''
        if access_token:
            folder_id = _get_or_create_drive_folder(access_token, DRIVE_FOLDER_NAME)

        token_obj, _ = GoogleDriveToken.objects.update_or_create(
            user=request.user,
            defaults={
                'access_token':    access_token,
                'refresh_token':   refresh_token,
                'token_expiry':    expiry,
                'scope':           token_data.get('scope', ''),
                'drive_folder_id': folder_id,
            }
        )
        return Response({
            'connected':   True,
            'folder_id':   folder_id,
            'folder_name': DRIVE_FOLDER_NAME,
        })


class DriveStatusView(APIView):
    """GET — returns Drive connection status + folder info."""
    def get(self, request):
        try:
            token_obj = GoogleDriveToken.objects.get(user=request.user)
            return Response({
                'connected':   True,
                'folder_id':   token_obj.drive_folder_id,
                'folder_name': DRIVE_FOLDER_NAME,
                'folder_url':  f'https://drive.google.com/drive/folders/{token_obj.drive_folder_id}' if token_obj.drive_folder_id else '',
            })
        except GoogleDriveToken.DoesNotExist:
            return Response({'connected': False})


class DriveDisconnectView(APIView):
    """DELETE — remove this user's Drive token."""
    def delete(self, request):
        GoogleDriveToken.objects.filter(user=request.user).delete()
        return Response({'disconnected': True})


class DriveSyncView(APIView):
    """
    POST — sync files FROM the Student_Assistant Drive folder into the platform.
    Only reads from the user's own Student_Assistant folder.
    """
    def post(self, request):
        try:
            token_obj = GoogleDriveToken.objects.get(user=request.user)
        except GoogleDriveToken.DoesNotExist:
            return Response({'error': 'Drive not connected. Connect first.'}, status=400)

        access_token = _get_valid_access_token(token_obj)
        if not access_token:
            return Response({'error': 'Could not refresh Drive token. Reconnect.'}, status=401)

        # Ensure folder exists
        if not token_obj.drive_folder_id:
            folder_id = _get_or_create_drive_folder(access_token)
            token_obj.drive_folder_id = folder_id
            token_obj.save(update_fields=['drive_folder_id'])
        else:
            folder_id = token_obj.drive_folder_id

        if not folder_id:
            return Response({'error': 'Could not access Student_Assistant folder.'}, status=400)

        headers = {'Authorization': f'Bearer {access_token}'}

        # List files inside the Student_Assistant folder
        mime_query = ' or '.join([
            "mimeType='application/pdf'",
            "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
            "mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation'",
            "mimeType='text/plain'",
        ])
        params = {
            'q':        f"'{folder_id}' in parents and ({mime_query}) and trashed=false",
            'fields':   'files(id,name,mimeType,size,modifiedTime)',
            'pageSize': 100,
            'orderBy':  'modifiedTime desc',
        }
        list_resp = requests.get(GOOGLE_DRIVE_FILES_URL, headers=headers, params=params, timeout=15)
        if list_resp.status_code != 200:
            return Response({'error': 'Failed to list Drive folder files'}, status=400)

        drive_files = list_resp.json().get('files', [])
        synced  = []
        skipped = []

        from apps.courses.models import StudyMaterial

        for df in drive_files:
            file_name     = df.get('name', 'untitled')
            ext           = os.path.splitext(file_name)[1].lower()
            drive_file_id = df['id']

            if ext not in ALLOWED_EXTENSIONS:
                skipped.append(file_name)
                continue

            # Skip already synced
            if StudyMaterial.objects.filter(uploaded_by=request.user, drive_file_id=drive_file_id).exists():
                skipped.append(file_name)
                continue

            # Prefer Cloudinary for storage; fall back to Drive direct link
            _make_drive_file_public(access_token, drive_file_id)
            drive_url  = f'https://drive.google.com/uc?export=download&id={drive_file_id}'
            public_url = drive_url

            # Try uploading to Cloudinary for more reliable access
            cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
            if cloud_name and cloud_name != 'your-cloud-name':
                try:
                    dl = requests.get(drive_url, timeout=60)
                    dl.raise_for_status()
                    cld_upload = _upload_to_cloudinary(
                        dl.content, file_name, ext,
                        folder=f'student_assistant/{request.user.id}'
                    )
                    if cld_upload:
                        public_url = cld_upload['url']
                except Exception:
                    pass  # keep Drive URL

            title    = file_name.rsplit('.', 1)[0]
            file_size = int(df.get('size') or 0)
            material = StudyMaterial.objects.create(
                title=title,
                file_url=public_url,
                file_name=file_name,
                file_size=file_size,
                file_type=ext.lstrip('.'),
                material_type='notes',
                uploaded_by=request.user,
                drive_file_id=drive_file_id,
            )

            UploadedFile.objects.create(
                uploaded_by=request.user,
                material=material,
                original_name=file_name,
                storage_path=f'drive/{drive_file_id}',
                public_url=public_url,
                file_size=file_size,
                mime_type=DRIVE_MIME_MAP.get(ext, 'application/octet-stream'),
                category='study_material',
            )

            _process_material_sync(material)
            synced.append(file_name)

        return Response({
            'synced':       synced,
            'skipped':      skipped,
            'total':        len(synced),
            'folder_name':  DRIVE_FOLDER_NAME,
            'folder_url':   f'https://drive.google.com/drive/folders/{folder_id}',
        })


# ── Cloudinary Health Check ───────────────────────────────────────────────────

class CloudinaryCheckView(APIView):
    """GET /api/files/cloudinary/check/ — verifies credentials and does a tiny test upload."""
    def get(self, request):
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
        if not cloud_name or cloud_name == 'your-cloud-name':
            return Response({
                'configured': False,
                'error': 'CLOUDINARY_CLOUD_NAME not set in .env',
            }, status=200)
        try:
            import cloudinary
            import cloudinary.uploader
            import cloudinary.api
            import io

            # Ping: upload a 1x1 white PNG then immediately delete it
            tiny_png = (
                b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
                b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
                b'\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18'
                b'\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
            )
            test_id = f'student_assistant/_healthcheck_{uuid.uuid4().hex}'
            result  = cloudinary.uploader.upload(
                io.BytesIO(tiny_png),
                public_id=test_id,
                resource_type='image',
                overwrite=True,
            )
            cloudinary.uploader.destroy(test_id, resource_type='image')

            return Response({
                'configured': True,
                'cloud_name': cloud_name,
                'test_url':   result.get('secure_url', ''),
                'status':     'ok — upload + delete succeeded',
            })
        except Exception as e:
            return Response({
                'configured': True,
                'cloud_name': cloud_name,
                'error':      str(e),
                'status':     'failed',
            }, status=200)


# ── Streak Update ─────────────────────────────────────────────────────────────

XP_REWARDS = {
    'daily_login':    10,
    'ai_session':     15,
    'quiz_complete':  25,
    'flashcard_set':  10,
    'upload_doc':     20,
    'streak_7':       50,
    'streak_30':     150,
}

def _award_xp_and_level(profile, xp_gain: int):
    """Add XP and recalculate level (100 XP per level)."""
    profile.xp += xp_gain
    profile.level = max(1, profile.xp // 100 + 1)
    profile.save(update_fields=['xp', 'level'])


class UpdateStreakView(APIView):
    def post(self, request):
        import datetime
        profile = getattr(request.user, 'student_profile', None)
        if not profile:
            return Response({'streak': 0, 'xp': 0})

        today = timezone.now().date()
        last  = profile.last_study_date

        if last == today:
            return Response({'streak': profile.streak, 'xp': profile.xp, 'level': profile.level})

        if last == today - datetime.timedelta(days=1):
            profile.streak += 1
        else:
            profile.streak = 1

        profile.last_study_date = today
        profile.save(update_fields=['streak', 'last_study_date'])
        _award_xp_and_level(profile, XP_REWARDS['daily_login'])

        try:
            from apps.notifications.models import Notification
            if profile.streak in (7, 14, 30, 60, 100) or profile.streak % 30 == 0:
                bonus = XP_REWARDS['streak_30'] if profile.streak >= 30 else XP_REWARDS['streak_7']
                _award_xp_and_level(profile, bonus)
                Notification.objects.create(
                    user=request.user,
                    title=f'🔥 {profile.streak}-day streak! +{bonus} XP',
                    message=f'Amazing! You\'ve studied {profile.streak} days in a row.',
                    notification_type='streak',
                )
        except Exception:
            pass

        return Response({'streak': profile.streak, 'xp': profile.xp, 'level': profile.level})


class AwardXPView(APIView):
    """
    POST /api/files/xp/award/
    Body: { "action": "ai_session" | "quiz_complete" | "flashcard_set" | "upload_doc" }
    Awards XP for a specific action.
    """
    def post(self, request):
        profile = getattr(request.user, 'student_profile', None)
        if not profile:
            return Response({'xp': 0, 'level': 1})
        action = request.data.get('action', '')
        gain = XP_REWARDS.get(action, 0)
        if gain > 0:
            _award_xp_and_level(profile, gain)
        return Response({'xp': profile.xp, 'level': profile.level, 'gained': gain})


# ── File Proxy (serves Cloudinary/remote files through Django to avoid CORS) ──

class FileProxyView(APIView):
    """
    GET /api/files/proxy/<material_id>/
    Fetches the file from its stored URL and streams it back with inline headers,
    so the browser can render it in an iframe without CORS/X-Frame-Options issues.
    """
    permission_classes = [permissions.AllowAny]

    def _viewer_user(self, request):
        if request.user and request.user.is_authenticated:
            return request.user

        raw_token = request.query_params.get('token', '').strip()
        if not raw_token:
            return None

        try:
            validated = AccessToken(raw_token)
            user_id = validated.get('user_id')
            return get_user_model().objects.filter(id=user_id).first()
        except (InvalidToken, TokenError, Exception):
            return None

    def get(self, request, material_id):
        from apps.courses.models import StudyMaterial
        user = self._viewer_user(request)
        if not user:
            auth_result = JWTAuthentication().authenticate(request)
            user = auth_result[0] if auth_result else None
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            qs = StudyMaterial.objects.all() if getattr(user, 'role', '') == 'admin' else StudyMaterial.objects.filter(uploaded_by=user)
            material = qs.get(id=material_id)
        except StudyMaterial.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        file_url = _cloudinary_inline_url(material.file_url, 'raw') if material.file_url else ''
        if not file_url:
            return Response({'error': 'No file URL'}, status=status.HTTP_404_NOT_FOUND)

        try:
            import requests as _req
            from django.http import StreamingHttpResponse
            resp = _req.get(file_url, stream=True, timeout=30)
            resp.raise_for_status()
            guessed = mimetypes.guess_type(material.file_name or '')[0]
            content_type = resp.headers.get('Content-Type') or guessed or 'application/octet-stream'
            if 'application/octet-stream' in content_type and guessed:
                content_type = guessed
            disposition = 'attachment' if request.query_params.get('download') == '1' else 'inline'
            filename = get_valid_filename(material.file_name or f'document.{material.file_type or "bin"}')
            streaming = StreamingHttpResponse(
                resp.iter_content(chunk_size=8192),
                content_type=content_type,
            )
            streaming['Content-Disposition'] = f'{disposition}; filename="{filename}"'
            streaming['X-Frame-Options'] = 'SAMEORIGIN'
            streaming['Access-Control-Allow-Origin'] = '*'
            return streaming
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f'[FileProxy] {material_id}: {e}')
            return Response({'error': 'Could not fetch file'}, status=status.HTTP_502_BAD_GATEWAY)


# ── FileViewSet ───────────────────────────────────────────────────────────────

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedFileSerializer

    def get_queryset(self):
        return UploadedFile.objects.filter(uploaded_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        file_obj = self.get_object()
        # Delete from Cloudinary if stored there
        if file_obj.public_url and 'cloudinary.com' in file_obj.public_url:
            delete_cloudinary_file(file_obj.public_url, file_obj.original_name)
        else:
            try:
                default_storage.delete(file_obj.storage_path)
            except Exception:
                pass
        file_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
