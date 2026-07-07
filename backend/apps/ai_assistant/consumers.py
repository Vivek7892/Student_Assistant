"""
ChatConsumer — Django Channels WebSocket consumer
Protocol (JSON frames):

  Client → Server:
    { "type": "chat",    "message": "...", "session_id": "...|null",
      "material_id": "...|null", "subject_id": "...|null", "language": "english" }
    { "type": "ping" }

  Server → Client:
    { "type": "session_created", "session_id": "..." }
    { "type": "token",           "data": "...",  "message_id": "..." }
    { "type": "sources",         "data": [...],  "message_id": "..." }
    { "type": "done",            "message_id": "...", "tokens_used": int, "model": "..." }
    { "type": "error",           "message": "..." }
    { "type": "pong" }
"""

import uuid
import json
import logging
from datetime import datetime, timezone as dt_tz

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(dt_tz.utc)


class ChatConsumer(AsyncWebsocketConsumer):

    # ── Connection lifecycle ──────────────────────────────────────────────────

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.user = user
        self.user_group = f'chat_{user.id}'
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        logger.info(f'[WS] Connected: user={user.id}')

    async def disconnect(self, code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        logger.info(f'[WS] Disconnected: code={code}')

    # ── Receive ───────────────────────────────────────────────────────────────

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            await self._send_error('Invalid JSON')
            return

        msg_type = data.get('type', 'chat')

        if msg_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
            return

        if msg_type == 'chat':
            await self._handle_chat(data)

    # ── Chat handler ──────────────────────────────────────────────────────────

    async def _handle_chat(self, data: dict):
        message     = (data.get('message') or '').strip()
        session_id  = data.get('session_id')
        material_id = data.get('material_id')
        subject_id  = data.get('subject_id')
        language    = data.get('language', 'english')

        if not message:
            await self._send_error('Message cannot be empty')
            return

        # Resolve or create session
        session_id, chat_history = await self._get_or_create_session(
            session_id, message, subject_id
        )
        await self.send(text_data=json.dumps({
            'type': 'session_created',
            'session_id': session_id,
        }))

        # Persist user message
        user_msg_id = str(uuid.uuid4())
        await self._save_message(session_id, {
            'id': user_msg_id,
            'role': 'user',
            'content': message,
            'sources': [],
            'created_at': _now().isoformat(),
        })

        # Determine collection
        collection_name = await self._resolve_collection(material_id, subject_id)

        # Stream Gemini response
        assistant_msg_id = str(uuid.uuid4())
        full_answer = ''
        tokens_used = 0
        model_name  = 'gemini-1.5-pro'
        sources     = []

        try:
            from .gemini_rag import gemini_rag
            # Run streaming in thread (sync generator)
            import asyncio
            loop = asyncio.get_event_loop()

            def _stream():
                return list(gemini_rag.query_stream(
                    question=message,
                    collection_name=collection_name,
                    chat_history=chat_history,
                    language=language,
                ))

            chunks = await loop.run_in_executor(None, _stream)

            for chunk in chunks:
                if chunk['type'] == 'sources':
                    sources = chunk['data']
                    await self.send(text_data=json.dumps({
                        'type': 'sources',
                        'data': sources,
                        'message_id': assistant_msg_id,
                    }))
                elif chunk['type'] == 'token':
                    full_answer += chunk['data']
                    await self.send(text_data=json.dumps({
                        'type': 'token',
                        'data': chunk['data'],
                        'message_id': assistant_msg_id,
                    }))
                elif chunk['type'] == 'done':
                    tokens_used = chunk.get('tokens_used', 0)
                    model_name  = chunk.get('model', 'gemini-1.5-pro')

        except ValueError as e:
            full_answer = str(e)
            await self.send(text_data=json.dumps({
                'type': 'token',
                'data': full_answer,
                'message_id': assistant_msg_id,
            }))
        except Exception as e:
            logger.error(f'[WS] Gemini error: {e}', exc_info=True)
            full_answer = 'Unable to process your request. Please ensure study materials are uploaded and your Gemini API key is configured.'
            await self.send(text_data=json.dumps({
                'type': 'token',
                'data': full_answer,
                'message_id': assistant_msg_id,
            }))

        # Persist assistant message
        await self._save_message(session_id, {
            'id': assistant_msg_id,
            'role': 'assistant',
            'content': full_answer,
            'sources': sources,
            'created_at': _now().isoformat(),
        })

        # Log token usage
        await self._log_usage(tokens_used, model_name, session_id)

        # Send done signal
        await self.send(text_data=json.dumps({
            'type': 'done',
            'message_id': assistant_msg_id,
            'tokens_used': tokens_used,
            'model': model_name,
        }))

    # ── DB helpers (sync → async) ─────────────────────────────────────────────

    @database_sync_to_async
    def _get_or_create_session(self, session_id, message, subject_id):
        from core.mongo import get_collection
        from apps.courses.models import Subject

        col = get_collection('chat_sessions')

        if session_id:
            session = col.find_one({'_id': session_id, 'user_id': str(self.user.id)})
            if session:
                msgs = session.get('messages', [])
                history = []
                for i in range(0, len(msgs) - 1, 2):
                    if msgs[i]['role'] == 'user' and msgs[i + 1]['role'] == 'assistant':
                        history.append((msgs[i]['content'], msgs[i + 1]['content']))
                return session_id, history

        # Create new session
        new_id = str(uuid.uuid4())
        subject_name = None
        if subject_id:
            subj = Subject.objects.filter(id=subject_id).first()
            subject_name = subj.name if subj else None

        col.insert_one({
            '_id': new_id,
            'user_id': str(self.user.id),
            'user_email': self.user.email,
            'subject_id': subject_id,
            'subject_name': subject_name,
            'title': message[:60],
            'messages': [],
            'created_at': _now(),
            'updated_at': _now(),
        })
        return new_id, []

    @database_sync_to_async
    def _save_message(self, session_id: str, msg: dict):
        from core.mongo import get_collection
        get_collection('chat_sessions').update_one(
            {'_id': session_id},
            {'$push': {'messages': msg}, '$set': {'updated_at': _now()}},
        )

    @database_sync_to_async
    def _resolve_collection(self, material_id, subject_id) -> str:
        if material_id:
            from apps.courses.models import StudyMaterial
            # Strict ownership: only allow access to user's own materials
            mat = StudyMaterial.objects.filter(
                id=material_id,
                is_processed=True,
                uploaded_by=self.user,
            ).first()
            # Admin can access any material
            if not mat and self.user.role == 'admin':
                mat = StudyMaterial.objects.filter(id=material_id, is_processed=True).first()
            if mat:
                return mat.vector_collection_id
        if subject_id:
            return f'subject_{subject_id}'
        return f'user_{self.user.id}'

    @database_sync_to_async
    def _log_usage(self, tokens_used: int, model_name: str, session_id: str):
        from .models import AIUsageLog
        from core.activity import record_activity
        AIUsageLog.objects.create(
            user=self.user,
            action='chat_ws',
            tokens_used=tokens_used,
            model_used=model_name,
            metadata={'session_id': session_id},
        )
        try:
            record_activity(self.user, 'ai_session')
        except Exception:
            pass

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _send_error(self, message: str):
        await self.send(text_data=json.dumps({'type': 'error', 'message': message}))
