"""Who is on the other end of a WebSocket. Browsers can not send an Authorization header with a WebSocket,
so the page passes its access token in the address: ws/notifications/?token=<access token>."""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from .models import User


@database_sync_to_async
def user_from_token(token):
    try:
        user_id = AccessToken(token)["user_id"]
    except (TokenError, KeyError):
        return AnonymousUser()
    return User.objects.filter(pk=user_id, is_active=True).first() or AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        token = parse_qs(scope.get("query_string", b"").decode()).get("token", [""])[0]
        scope["user"] = await user_from_token(token) if token else AnonymousUser()
        return await self.inner(scope, receive, send)
