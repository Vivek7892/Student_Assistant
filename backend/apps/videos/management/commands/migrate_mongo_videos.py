from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.videos.models import SavedVideo
from core.mongo import get_collection


class Command(BaseCommand):
    help = 'Copy legacy Mongo videos_v2 records into the SQL saved_videos table.'

    def duration_seconds(self, value):
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        return 0

    def handle(self, *args, **options):
        User = get_user_model()
        copied = 0
        skipped = 0

        for doc in get_collection('videos_v2').find({}):
            user_id = doc.get('user_id')
            video_id = doc.get('videoId')
            if not user_id or not video_id:
                skipped += 1
                continue
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                skipped += 1
                continue

            _, created = SavedVideo.objects.get_or_create(
                user=user,
                video_id=video_id,
                defaults={
                    'url': doc.get('url') or f'https://www.youtube.com/watch?v={video_id}',
                    'title': doc.get('title') or f'YouTube Video ({video_id})',
                    'thumbnail': doc.get('thumbnail') or '',
                    'channel': doc.get('channel') or '',
                    'duration': self.duration_seconds(doc.get('duration')),
                    'duration_fmt': doc.get('durationFmt') or '',
                    'description': doc.get('description') or '',
                    'folder': doc.get('folder') or doc.get('folderId') or '',
                    'notes': doc.get('notes') or '',
                    'tags': doc.get('tags') if isinstance(doc.get('tags'), list) else [],
                    'status': doc.get('status') or 'watching',
                    'favorite': bool(doc.get('favorite', False)),
                },
            )
            if created:
                copied += 1
            else:
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Copied {copied} video(s), skipped {skipped}.'))
