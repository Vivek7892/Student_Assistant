from pymongo import MongoClient, ASCENDING, DESCENDING
from django.conf import settings

_client = None


def get_mongo_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI)
        db = _client[settings.MONGO_DB_NAME]
        # Enforce indexes: user_id scoping + performance
        db['chat_sessions'].create_index([('user_id', ASCENDING), ('updated_at', DESCENDING)])
        db['chat_sessions'].create_index([('_id', ASCENDING), ('user_id', ASCENDING)], unique=True)
        db['videos'].create_index([('user_id', ASCENDING), ('createdAt', DESCENDING)])
        db['videos'].create_index([('user_id', ASCENDING), ('collectionId', ASCENDING)])
        return db
    return _client[settings.MONGO_DB_NAME]


def get_collection(name: str):
    return get_mongo_db()[name]
