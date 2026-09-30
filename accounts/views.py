import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
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

from .models import Notification, PhoneCode, User
from .serializers import (
    LogoutSerializer, NotificationSerializer, SendCodeSerializer, UserSerializer, VerifyCodeSerializer,
)
from .sms import send_sms

# A new code can be asked for the same number at most once a minute.
RESEND_PAUSE_SECONDS = 60


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class SendCodeView(APIView):
    """Step 1 of login and sign-up: sends a 6-digit code by SMS to the phone number."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "sms"

    @swagger_auto_schema(request_body=SendCodeSerializer)
    def post(self, request):
        serializer = SendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        existing = PhoneCode.objects.filter(phone=phone).first()
        if existing and (timezone.now() - existing.sent_at).total_seconds() < RESEND_PAUSE_SECONDS:
            return Response(
                {"detail": "A code was just sent. Wait a minute before asking for a new one."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = f"{secrets.randbelow(10**6):06d}"
        PhoneCode.objects.update_or_create(
            phone=phone,
            defaults={"code_hash": make_password(code), "sent_at": timezone.now(), "attempts": 0},
        )
        send_sms(phone, f"Муҳоҷир: рамзи воридшавӣ {code}")
        return Response({"detail": "Code sent.", "is_new_user": not User.objects.filter(phone=phone).exists()})


class VerifyCodeView(APIView):
    """Step 2: checks the code and returns JWT tokens. The first successful code creates the account."""

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(request_body=VerifyCodeSerializer)
    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        phone = data["phone"]

        with transaction.atomic():
            entry = PhoneCode.objects.select_for_update().filter(phone=phone).first()
            if entry is None or timezone.now() - entry.sent_at > settings.SMS_CODE_LIFETIME:
                return Response({"detail": "The code has expired. Ask for a new one."}, status=status.HTTP_400_BAD_REQUEST)
            if entry.attempts >= settings.SMS_CODE_MAX_ATTEMPTS:
                return Response({"detail": "Too many wrong tries. Ask for a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if not check_password(data["code"], entry.code_hash):
                entry.attempts += 1
                entry.save(update_fields=["attempts"])
                return Response({"detail": "Wrong code."}, status=status.HTTP_400_BAD_REQUEST)
            entry.delete()

            user, created = User.objects.get_or_create(
                phone=phone,
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
    filterset_fields = ["kind", "is_read"]
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
