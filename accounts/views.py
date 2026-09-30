from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, permissions, status, viewsets
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

# A new code can be asked for the same email at most once a minute.
RESEND_PAUSE_SECONDS = 60


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class SendCodeView(APIView):
    """Step 1 of login and sign-up: sends a 6-digit code to the email address."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login_code"

    @swagger_auto_schema(request_body=SendCodeSerializer)
    def post(self, request):
        serializer = SendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        existing = EmailCode.objects.filter(email=email).first()
        if existing and (timezone.now() - existing.sent_at).total_seconds() < RESEND_PAUSE_SECONDS:
            return Response(
                {"detail": "A code was just sent. Wait a minute before asking for a new one."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            send_login_code(email)
        except OSError:  # SMTP server down or refused the login
            return Response(
                {"detail": "The email could not be sent. Try again in a few minutes."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"detail": "Code sent.", "is_new_user": not User.objects.filter(email=email).exists()})


class VerifyCodeView(APIView):
    """Step 2: checks the code and returns JWT tokens. The first successful code creates the account."""

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(request_body=VerifyCodeSerializer)
    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"]

        with transaction.atomic():
            entry = EmailCode.objects.select_for_update().filter(email=email).first()
            if entry is None or timezone.now() - entry.sent_at > settings.LOGIN_CODE_LIFETIME:
                return Response({"detail": "The code has expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
            if entry.attempts >= settings.LOGIN_CODE_MAX_ATTEMPTS:
                return Response({"detail": "Too many wrong tries. Ask for a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(data["code"], entry.code_hash):
                entry.attempts += 1
                entry.save(update_fields=["attempts"])
                return Response({"detail": "Wrong code."}, status=status.HTTP_400_BAD_REQUEST)
            entry.delete()

            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": data.get("full_name", ""), "role": data["role"]},
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])

        if not user.is_active:
            return Response({"detail": "This account is blocked."}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {"user": UserSerializer(user).data, "is_new_user": created, **tokens_for(user)},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(request_body=LogoutSerializer)
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(RetrieveUpdateAPIView):
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
