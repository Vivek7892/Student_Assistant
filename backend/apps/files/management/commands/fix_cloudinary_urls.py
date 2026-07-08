import re
from django.core.management.base import BaseCommand
from apps.courses.models import StudyMaterial
from apps.files.models import UploadedFile


def _strip_transformations(url: str) -> str:
    """Remove Cloudinary transformation segments (e.g. fl_inline/) from a URL."""
    if not url or 'cloudinary.com' not in url or '/upload/' not in url:
        return url
    upload_split = url.split('/upload/', 1)
    parts = upload_split[1].split('/')
    while parts and (
        ('_' in parts[0] or ',' in parts[0])
        and not re.match(r'^v\d+$', parts[0])
    ):
        parts = parts[1:]
    return upload_split[0] + '/upload/' + '/'.join(parts)


class Command(BaseCommand):
    help = 'Strip fl_inline and other Cloudinary transformations from stored file URLs'

    def handle(self, *args, **options):
        fixed = 0
        for m in StudyMaterial.objects.filter(file_url__contains='cloudinary.com'):
            clean = _strip_transformations(m.file_url)
            if clean != m.file_url:
                m.file_url = clean
                m.save(update_fields=['file_url'])
                fixed += 1

        for f in UploadedFile.objects.filter(public_url__contains='cloudinary.com'):
            clean = _strip_transformations(f.public_url)
            if clean != f.public_url:
                f.public_url = clean
                f.save(update_fields=['public_url'])
                fixed += 1

        self.stdout.write(self.style.SUCCESS(f'Fixed {fixed} URLs'))
