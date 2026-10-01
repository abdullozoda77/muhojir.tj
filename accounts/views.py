"""Login without a password, in two steps:
1. POST /api/auth/send-code/   {email}        -> we email a 6-digit code
2. POST /api/auth/verify-code/ {email, code}  -> we check it and give JWT tokens (a new email gets a new account)
Then: token/refresh/ gives a new access token, logout/ ends the login, profile/ shows and edits the user."""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db.models import F
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import send_login_code
from .filters import NotificationFilter
from .models import EmailCode, Notification, User
from .serializers import (
    LogoutSerializer, NotificationSerializer, SendCodeSerializer, UserSerializer, VerifyCodeSerializer,
)

RESEND_PAUSE = timedelta(minutes=1)  # a new code for the same email at most once a minute


def error(text, status=400):
    return Response({"detail": text}, status=status)


def make_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class SendCodeView(APIView):
    """Step 1: send a login code to the email."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]  # at most 5 codes an hour from one visitor
    throttle_scope = "login_code"

    @swagger_auto_schema(request_body=SendCodeSerializer)
    def post(self, request):
        serializer = SendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        old_code = EmailCode.objects.filter(email=email).first()
        if old_code and timezone.now() - old_code.sent_at < RESEND_PAUSE:
            return error("A code was just sent. Wait a minute before asking for a new one.", 429)

        try:
            send_login_code(email)
        except OSError:  # the mail server is down or refused us
            return error("The email could not be sent. Try again in a few minutes.", 503)

        is_new_user = not User.objects.filter(email=email).exists()
        return Response({"detail": "Code sent.", "is_new_user": is_new_user})


class VerifyCodeView(APIView):
    """Step 2: check the code and log in. The first login with a new email creates the account."""

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(request_body=VerifyCodeSerializer)
    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"]

        code = EmailCode.objects.filter(email=email).first()
        if code is None or timezone.now() - code.sent_at > settings.LOGIN_CODE_LIFETIME:
            return error("The code has expired. Ask for a new one.")
        if code.attempts >= settings.LOGIN_CODE_MAX_ATTEMPTS:
            return error("Too many wrong tries. Ask for a new code.")
        if not check_password(data["code"], code.code_hash):  # only a hash of the code is stored
            EmailCode.objects.filter(pk=code.pk).update(attempts=F("attempts") + 1)
            return error("Wrong code.")
        code.delete()  # a code works only once

        user = User.objects.filter(email=email).first()
        is_new_user = user is None
        if is_new_user:
            user = User.objects.create_user(email, full_name=data.get("full_name", ""), role=data["role"])
        if not user.is_active:
            return error("This account is blocked.", 403)

        return Response(
            {"user": UserSerializer(user).data, "is_new_user": is_new_user, **make_tokens(user)},
            status=201 if is_new_user else 200,
        )


class LogoutView(APIView):
    """Log out: the refresh token goes on the blacklist, so it can not be used again."""

    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(request_body=LogoutSerializer)
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return error("Invalid or expired token.")
        return Response(status=204)


class ProfileView(RetrieveUpdateAPIView):
    """GET: my profile. PATCH: change name, phone, city, language, email reminders."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                          mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = NotificationFilter
    http_method_names = ["get", "patch", "post", "delete"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(is_read=False).count()})

    @swagger_auto_schema(request_body=None)
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"updated": updated})
