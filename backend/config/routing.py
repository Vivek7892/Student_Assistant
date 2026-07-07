"""
Unified WebSocket URL routing.
JWT token is passed as query param: ws://host/ws/chat/?token=<access_token>
"""

from django.urls import re_path
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

from apps.notifications.consumers import NotificationConsumer
from apps.ai_assistant.consumers import ChatConsumer


# ── JWT WebSocket Auth Middleware ─────────────────────────────────────────────

class JWTAuthMiddleware(BaseMiddleware):
    """Authenticates WS connections via ?token=<jwt> query param."""

    async def __call__(self, scope, receive, send):
        scope['user'] = await self._get_user(scope)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, scope):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        query_string = scope.get('query_string', b'').decode()
        params = dict(p.split('=') for p in query_string.split('&') if '=' in p)
        token_str = params.get('token', '')

        if not token_str:
            return AnonymousUser()
        try:
            token = AccessToken(token_str)
            return User.objects.get(id=token['user_id'])
        except Exception:
            return AnonymousUser()


# ── URL Patterns ──────────────────────────────────────────────────────────────

websocket_urlpatterns = [
    re_path(r'^ws/chat/$',          ChatConsumer.as_asgi()),
    re_path(r'^ws/notifications/$', NotificationConsumer.as_asgi()),
]


def get_ws_application():
    from channels.routing import URLRouter
    return JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
