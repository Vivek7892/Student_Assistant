import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter
from config.routing import get_ws_application

application = ProtocolTypeRouter({
    'http':      get_asgi_application(),
    'websocket': get_ws_application(),
})
