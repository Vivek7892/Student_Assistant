from bson import ObjectId
from bson.errors import InvalidId
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.mongo import get_collection


def _col():
    return get_collection('videos')


def _serialize(doc):
    doc['id'] = str(doc.pop('_id'))
    return doc


class VideoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = {'user_id': str(request.user.id)}
        if cid := request.query_params.get('collectionId'):
            q['collectionId'] = cid
        if fav := request.query_params.get('favorite'):
            q['favorite'] = fav.lower() == 'true'
        docs = [_serialize(d) for d in _col().find(q).sort('createdAt', -1)]
        return Response(docs)

    def post(self, request):
        data = request.data.copy()
        now = timezone.now().isoformat()
        data.update({
            'user_id': str(request.user.id),
            'favorite': data.get('favorite', False),
            'tags': data.get('tags', []),
            'notes': data.get('notes', ''),
            'createdAt': now,
            'updatedAt': now,
        })
        result = _col().insert_one(data)
        data['id'] = str(result.inserted_id)
        data.pop('_id', None)
        return Response(data, status=status.HTTP_201_CREATED)


class VideoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_doc(self, vid, user_id):
        try:
            return _col().find_one({'_id': ObjectId(vid), 'user_id': user_id})
        except InvalidId:
            return None

    def get(self, request, vid):
        doc = self._get_doc(vid, str(request.user.id))
        if not doc:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize(doc))

    def patch(self, request, vid):
        user_id = str(request.user.id)
        doc = self._get_doc(vid, user_id)
        if not doc:
            return Response(status=status.HTTP_404_NOT_FOUND)
        update = {k: v for k, v in request.data.items() if k not in ('_id', 'id', 'user_id', 'createdAt')}
        update['updatedAt'] = timezone.now().isoformat()
        _col().update_one({'_id': ObjectId(vid)}, {'$set': update})
        doc.update(update)
        return Response(_serialize(doc))

    def delete(self, request, vid):
        result = _col().delete_one({'_id': ObjectId(vid), 'user_id': str(request.user.id)})
        if result.deleted_count == 0:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
