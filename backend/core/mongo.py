from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from django.conf import settings

_client = None


def get_mongo_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db = _client[settings.MONGO_DB_NAME]

        def safe_create_index(collection_name, keys, **kwargs):
            try:
                db[collection_name].create_index(keys, **kwargs)
            except Exception:
                pass

        # ── chat_sessions ─────────────────────────────────────────────────────
        # Scoped by user, sorted by recency
        safe_create_index(
            'chat_sessions',
            [('user_id', ASCENDING), ('updated_at', DESCENDING)],
            name='chat_user_updated'
        )
        # Unique session ownership
        safe_create_index(
            'chat_sessions',
            [('_id', ASCENDING), ('user_id', ASCENDING)],
            unique=True, name='chat_id_user'
        )
        # Full-text search on session titles
        safe_create_index(
            'chat_sessions',
            [('title', TEXT)],
            name='chat_title_text'
        )

        # ── videos_v2 ─────────────────────────────────────────────────────────
        safe_create_index(
            'videos_v2',
            [('user_id', ASCENDING), ('createdAt', DESCENDING)],
            name='video_user_created'
        )
        safe_create_index(
            'videos_v2',
            [('user_id', ASCENDING), ('videoId', ASCENDING)],
            unique=True, name='video_user_video_unique'
        )
        safe_create_index(
            'videos_v2',
            [('user_id', ASCENDING), ('folderId', ASCENDING)],
            name='video_user_folder'
        )
        safe_create_index(
            'videos_v2',
            [('user_id', ASCENDING), ('folder', ASCENDING)],
            name='video_user_folder_name'
        )
        safe_create_index(
            'videos_v2',
            [('user_id', ASCENDING), ('favorite', ASCENDING)],
            name='video_user_fav'
        )
        safe_create_index(
            'videos_v2',
            [('title', TEXT), ('channel', TEXT), ('folder', TEXT), ('notes', TEXT), ('tags', TEXT)],
            name='video_watch_later_text'
        )
        video_schema = {
            '$jsonSchema': {
                'bsonType': 'object',
                'required': ['user_id', 'url', 'videoId', 'title', 'createdAt', 'favorite'],
                'properties': {
                    'user_id': {'bsonType': 'string'},
                    'url': {'bsonType': 'string'},
                    'videoId': {'bsonType': 'string'},
                    'title': {'bsonType': 'string'},
                    'thumbnail': {'bsonType': 'string'},
                    'channel': {'bsonType': 'string'},
                    'duration': {'bsonType': ['int', 'long', 'double', 'string']},
                    'durationFmt': {'bsonType': 'string'},
                    'description': {'bsonType': 'string'},
                    'folder': {'bsonType': ['string', 'null']},
                    'folderId': {'bsonType': ['string', 'null']},
                    'notes': {'bsonType': 'string'},
                    'tags': {'bsonType': 'array', 'items': {'bsonType': 'string'}},
                    'favorite': {'bsonType': 'bool'},
                    'createdAt': {'bsonType': 'string'},
                    'updatedAt': {'bsonType': 'string'},
                },
            }
        }
        try:
            db.command('collMod', 'videos_v2', validator=video_schema, validationLevel='moderate')
        except Exception:
            try:
                db.create_collection('videos_v2', validator=video_schema, validationLevel='moderate')
            except Exception:
                pass

        # ── video_folders ─────────────────────────────────────────────────────
        safe_create_index(
            'video_folders',
            [('user_id', ASCENDING), ('name', ASCENDING)],
            unique=True, name='folder_user_name'
        )

        # ── pdf_metadata ──────────────────────────────────────────────────────
        # Stores Cloudinary public_id + extraction metadata per material
        safe_create_index(
            'pdf_metadata',
            [('material_id', ASCENDING)],
            unique=True, name='pdf_material_id'
        )
        safe_create_index(
            'pdf_metadata',
            [('user_id', ASCENDING), ('uploaded_at', DESCENDING)],
            name='pdf_user_uploaded'
        )

        return db
    return _client[settings.MONGO_DB_NAME]


def get_collection(name: str):
    return get_mongo_db()[name]


def store_pdf_metadata(material_id: str, user_id: str, cloudinary_url: str,
                       public_id: str, file_name: str, file_size: int,
                       page_count: int = 0, text_preview: str = ''):
    """
    Upsert PDF/document metadata into MongoDB pdf_metadata collection.
    Called after every Cloudinary upload so we have a fast lookup by material_id.
    """
    from datetime import datetime, timezone as dt_tz
    get_collection('pdf_metadata').update_one(
        {'material_id': material_id},
        {'$set': {
            'user_id': user_id,
            'cloudinary_url': cloudinary_url,
            'public_id': public_id,
            'file_name': file_name,
            'file_size': file_size,
            'page_count': page_count,
            'text_preview': text_preview[:500],
            'uploaded_at': datetime.now(dt_tz.utc),
        }},
        upsert=True,
    )
