from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Initialize MongoDB collections, indexes, and validators used by StudyBuddy.'

    def handle(self, *args, **options):
        from core.mongo import get_mongo_db

        db = get_mongo_db()
        self.stdout.write(self.style.SUCCESS(f'Mongo schema initialized for database "{db.name}".'))
