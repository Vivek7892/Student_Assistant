import re
import requests
from urllib.parse import parse_qs, urlparse
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from django.conf import settings
from django.db import IntegrityError
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.mongo import get_collection
from .models import SavedVideo

YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
YOUTUBE_OEMBED_URL = 'https://www.youtube.com/oembed'

YT_ID_RE = re.compile(
    r'(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})'
)


def _extract_video_id(url: str) -> str | None:
    raw = (url or '').strip()
    if re.fullmatch(r'[A-Za-z0-9_-]{11}', raw):
        return raw
    parsed = urlparse(raw if raw.startswith(('http://', 'https://')) else f'https://{raw}')
    host = parsed.netloc.lower().replace('www.', '').replace('m.', '')
    if host == 'youtu.be':
        candidate = parsed.path.strip('/').split('/')[0]
        return candidate if re.fullmatch(r'[A-Za-z0-9_-]{11}', candidate or '') else None
    if host.endswith('youtube.com'):
        if parsed.path == '/watch':
            candidate = parse_qs(parsed.query).get('v', [''])[0]
            return candidate if re.fullmatch(r'[A-Za-z0-9_-]{11}', candidate or '') else None
        parts = [part for part in parsed.path.split('/') if part]
        if len(parts) >= 2 and parts[0] in ('embed', 'shorts', 'live'):
            candidate = parts[1]
            return candidate if re.fullmatch(r'[A-Za-z0-9_-]{11}', candidate or '') else None
    m = YT_ID_RE.search(raw)
    return m.group(1) if m else None


def _canonical_url(video_id: str) -> str:
    return f'https://www.youtube.com/watch?v={video_id}'


def _parse_duration(iso: str) -> int:
    m = re.match(r'PT(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+)S)?', iso or '')
    if not m:
        return 0
    return int(m.group('h') or 0) * 3600 + int(m.group('m') or 0) * 60 + int(m.group('s') or 0)


def _fmt_duration(secs: int) -> str:
    if secs <= 0:
        return ''
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def _fetch_yt_meta(video_id: str, api_key: str) -> dict | None:
    try:
        r = requests.get(YOUTUBE_VIDEOS_URL, params={
            'part': 'snippet,contentDetails,statistics',
            'id': video_id,
            'key': api_key,
        }, timeout=10)
        r.raise_for_status()
        items = r.json().get('items', [])
        if not items:
            return None
        item = items[0]
        snippet = item.get('snippet', {})
        thumbs = snippet.get('thumbnails', {})
        secs = _parse_duration(item['contentDetails']['duration'])
        return {
            'url':         _canonical_url(video_id),
            'videoId':     video_id,
            'title':       snippet.get('title', ''),
            'channel':     snippet.get('channelTitle', ''),
            'thumbnail':   (
                thumbs.get('maxres', {}).get('url') or
                thumbs.get('high', {}).get('url') or
                thumbs.get('medium', {}).get('url') or
                f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg'
            ),
            'duration':    secs,
            'durationFmt': _fmt_duration(secs),
            'description': snippet.get('description', ''),
        }
    except Exception:
        return None


def _fetch_oembed_meta(video_id: str) -> dict | None:
    """Fallback metadata path that does not require a YouTube Data API key."""
    try:
        url = _canonical_url(video_id)
        r = requests.get(YOUTUBE_OEMBED_URL, params={'url': url, 'format': 'json'}, timeout=8)
        r.raise_for_status()
        data = r.json()
        return {
            'url':         url,
            'videoId':     video_id,
            'title':       data.get('title') or video_id,
            'channel':     data.get('author_name') or '',
            'thumbnail':   data.get('thumbnail_url') or f'https://img.youtube.com/vi/{video_id}/mqdefault.jpg',
            'duration':    0,
            'durationFmt': '',
            'description': '',
            'metadataSource': 'youtube_oembed',
        }
    except Exception:
        return None


def _fallback_meta(video_id: str) -> dict:
    url = _canonical_url(video_id)
    return {
        'url': url,
        'videoId': video_id,
        'title': f'YouTube Video ({video_id})',
        'channel': '',
        'thumbnail': f'https://img.youtube.com/vi/{video_id}/hqdefault.jpg',
        'duration': 0,
        'durationFmt': '',
        'description': '',
        'metadataSource': 'fallback',
    }


def _resolve_meta(video_id: str) -> dict:
    api_key = getattr(settings, 'YOUTUBE_API_KEY', '')
    return (
        (_fetch_yt_meta(video_id, api_key) if api_key else None) or
        _fetch_oembed_meta(video_id) or
        _fallback_meta(video_id)
    )


# ── helpers ───────────────────────────────────────────────────────────────────

def _vcol():
    return get_collection('videos_v2')


def _fcol():
    return get_collection('video_folders')


def _ser(doc: dict) -> dict:
    doc['id'] = str(doc.pop('_id'))
    return doc


def _video_ser(video: SavedVideo) -> dict:
    return {
        'id': str(video.id),
        'url': video.url,
        'videoId': video.video_id,
        'title': video.title,
        'thumbnail': video.thumbnail,
        'channel': video.channel,
        'duration': video.duration,
        'durationFmt': video.duration_fmt,
        'description': video.description,
        'folder': video.folder or None,
        'folderId': video.folder or None,
        'notes': video.notes,
        'tags': video.tags or [],
        'status': video.status,
        'favorite': video.favorite,
        'createdAt': video.created_at.isoformat() if video.created_at else '',
        'updatedAt': video.updated_at.isoformat() if video.updated_at else '',
    }


def _uid(request) -> str:
    return str(request.user.id)


def _clean_tags(tags) -> list[str]:
    if isinstance(tags, str):
        tags = tags.split(',')
    if not isinstance(tags, list):
        return []
    cleaned: list[str] = []
    for tag in tags:
        name = str(tag).strip()
        if name and name not in cleaned:
            cleaned.append(name)
    return cleaned


def _folder_value(data: dict):
    value = data.get('folder')
    if value is None:
        value = data.get('folderId')
    if value is None:
        value = data.get('collectionId')
    value = str(value).strip() if value is not None else ''
    return value or None


# ── YouTube fetch preview ─────────────────────────────────────────────────────

class YouTubeFetchView(APIView):
    """POST /api/videos/fetch/  body: {url}  → video metadata"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        url = (request.data.get('url') or '').strip()
        if not url:
            return Response({'error': 'url is required'}, status=400)
        vid = _extract_video_id(url)
        if not vid:
            return Response({'error': 'Invalid YouTube URL'}, status=400)
        return Response(_resolve_meta(vid))


# ── YouTube search ────────────────────────────────────────────────────────────

class YouTubeSearchView(APIView):
    """GET /api/videos/search/?q=<query>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'error': 'q is required'}, status=400)
        api_key = getattr(settings, 'YOUTUBE_API_KEY', '')
        if not api_key:
            return Response({'error': 'YOUTUBE_API_KEY not configured'}, status=503)
        try:
            r = requests.get(YOUTUBE_SEARCH_URL, params={
                'part': 'snippet', 'type': 'video', 'maxResults': 12,
                'q': q, 'key': api_key,
            }, timeout=10)
            r.raise_for_status()
            raw = [i for i in r.json().get('items', []) if i.get('id', {}).get('videoId')]
            ids = [i['id']['videoId'] for i in raw]
            # batch fetch durations
            dur_map: dict[str, int] = {}
            if ids:
                dr = requests.get(YOUTUBE_VIDEOS_URL, params={
                    'part': 'contentDetails', 'id': ','.join(ids), 'key': api_key,
                }, timeout=10)
                dr.raise_for_status()
                for item in dr.json().get('items', []):
                    secs = _parse_duration(item['contentDetails']['duration'])
                    dur_map[item['id']] = secs
            items = [{
                'url':         _canonical_url(i['id']['videoId']),
                'videoId':     i['id']['videoId'],
                'title':       i['snippet']['title'],
                'channel':     i['snippet']['channelTitle'],
                'thumbnail':   i['snippet']['thumbnails'].get('medium', {}).get('url', ''),
                'duration':    dur_map.get(i['id']['videoId'], 0),
                'durationFmt': _fmt_duration(dur_map.get(i['id']['videoId'], 0)),
                'description': i['snippet'].get('description', ''),
            } for i in raw]
            return Response({'items': items})
        except requests.HTTPError as e:
            return Response({'error': str(e)}, status=502)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ── Folders ───────────────────────────────────────────────────────────────────

class FolderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        docs = [_ser(d) for d in _fcol().find({'user_id': _uid(request)}).sort('name', 1)]
        return Response(docs)

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        color = request.data.get('color', '#6366f1')
        if not name:
            return Response({'error': 'name is required'}, status=400)
        now = timezone.now().isoformat()
        doc = {'user_id': _uid(request), 'name': name, 'color': color, 'createdAt': now}
        result = _fcol().insert_one(doc)
        doc['id'] = str(result.inserted_id)
        doc.pop('_id', None)
        return Response(doc, status=201)


class FolderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, fid, uid):
        try:
            return _fcol().find_one({'_id': ObjectId(fid), 'user_id': uid})
        except InvalidId:
            return None

    def patch(self, request, fid):
        uid = _uid(request)
        doc = self._get(fid, uid)
        if not doc:
            return Response(status=404)
        update = {k: v for k, v in request.data.items() if k in ('name', 'color')}
        if not update:
            return Response({'error': 'Nothing to update'}, status=400)
        _fcol().update_one({'_id': ObjectId(fid)}, {'$set': update})
        doc.update(update)
        return Response(_ser(doc))

    def delete(self, request, fid):
        uid = _uid(request)
        doc = self._get(fid, uid)
        if not doc:
            return Response(status=404)
        move_to = request.query_params.get('moveTo')
        if move_to:
            _vcol().update_many(
                {'user_id': uid, 'folderId': fid},
                {'$set': {'folderId': move_to}}
            )
        else:
            _vcol().update_many(
                {'user_id': uid, 'folderId': fid},
                {'$set': {'folderId': None}}
            )
        _fcol().delete_one({'_id': ObjectId(fid)})
        return Response(status=204)


# ── Videos ────────────────────────────────────────────────────────────────────

class VideoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SavedVideo.objects.filter(user=request.user)
        if fid := request.query_params.get('folderId'):
            qs = qs.filter(folder=fid)
        if request.query_params.get('favorite') == 'true':
            qs = qs.filter(favorite=True)
        if status_f := request.query_params.get('status'):
            qs = qs.filter(status=status_f)
        if search := request.query_params.get('q', '').strip():
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(channel__icontains=search) |
                Q(folder__icontains=search) |
                Q(notes__icontains=search) |
                Q(description__icontains=search) |
                Q(tags__icontains=search)
            )
        return Response([_video_ser(video) for video in qs.order_by('-created_at')])

    def post(self, request):
        data = dict(request.data)
        url = (data.get('url') or '').strip()
        video_id = (data.get('videoId') or '').strip()
        if url and not video_id:
            video_id = _extract_video_id(url) or ''
        if not video_id:
            return Response({'error': 'A valid YouTube URL is required'}, status=400)
        meta = _resolve_meta(video_id)
        title = (data.get('title') or meta.get('title') or '').strip()
        if not title:
            title = f'YouTube Video ({video_id})'
        folder = _folder_value(data)
        if SavedVideo.objects.filter(user=request.user, video_id=video_id).exists():
            return Response({'error': 'This YouTube video is already saved.'}, status=409)
        try:
            video = SavedVideo.objects.create(
                user=request.user,
                url=url or meta.get('url') or _canonical_url(video_id),
                video_id=video_id,
                title=title,
                channel=data.get('channel') or meta.get('channel', ''),
                thumbnail=data.get('thumbnail') or meta.get('thumbnail', ''),
                duration=int(data.get('duration', meta.get('duration', 0)) or 0),
                duration_fmt=data.get('durationFmt') or meta.get('durationFmt', ''),
                description=data.get('description') or meta.get('description', ''),
                folder=folder or '',
                notes=str(data.get('notes', '')).strip(),
                tags=_clean_tags(data.get('tags', [])),
                status=data.get('status', 'watching'),
                favorite=bool(data.get('favorite', False)),
            )
        except IntegrityError:
            return Response({'error': 'This YouTube video is already saved.'}, status=409)
        except Exception as exc:
            return Response({'error': f'Could not save video: {exc}'}, status=500)
        return Response(_video_ser(video), status=201)


class VideoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, vid, uid):
        try:
            return SavedVideo.objects.get(id=vid, user_id=uid)
        except (SavedVideo.DoesNotExist, ValueError):
            return None

    def get(self, request, vid):
        doc = self._get(vid, _uid(request))
        if not doc:
            return Response(status=404)
        return Response(_video_ser(doc))

    def patch(self, request, vid):
        uid = _uid(request)
        video = self._get(vid, uid)
        if not video:
            return Response(status=404)
        data = request.data
        if 'title' in data:
            video.title = str(data.get('title') or video.title).strip() or video.title
        if 'notes' in data:
            video.notes = str(data.get('notes', '')).strip()
        if 'tags' in data:
            video.tags = _clean_tags(data.get('tags', []))
        if 'folder' in data or 'folderId' in data:
            video.folder = _folder_value(data) or ''
        if 'status' in data:
            video.status = str(data.get('status') or video.status)
        if 'favorite' in data:
            video.favorite = bool(data.get('favorite', False))
        video.save()
        return Response(_video_ser(video))

    def delete(self, request, vid):
        video = self._get(vid, _uid(request))
        if not video:
            return Response(status=404)
        video.delete()
        return Response(status=204)
