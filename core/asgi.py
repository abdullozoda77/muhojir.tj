"""ASGI entry point: normal HTTP requests go to Django, WebSockets (ws/...) to Channels.
Run it with `python manage.py runserver` (Daphne) in development, or `daphne core.asgi:application` on a server."""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django_app = get_asgi_application()  # set up Django before importing anything that uses models

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from accounts.routing import websocket_urlpatterns  # noqa: E402
from accounts.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_app,
    "websocket": AllowedHostsOriginValidator(JWTAuthMiddleware(URLRouter(websocket_urlpatterns))),
})
