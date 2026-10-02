"""Sign-up and login with an email and a password:
1. POST /api/auth/register/      {email, password, full_name} -> account made, a 6-digit code goes to the email
2. POST /api/auth/verify-email/  {email, code}                -> email confirmed, JWT tokens given
3. POST /api/auth/login/         {email, password}            -> JWT tokens (only once the email is confirmed)
Forgot the password: POST password/forgot/ {email} sends a code, POST password/reset/ {email, code, password}.
resend-code/ {email} sends the sign-up code again. Then: token/refresh/, logout/, profile/."""
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

from .emails import send_code
from .filters import NotificationFilter
from .models import EmailCode, Notification, User
from .serializers import (
    CodeSerializer, EmailSerializer, LoginSerializer, LogoutSerializer, NotificationSerializer, RegisterSerializer,
    ResetPasswordSerializer, UserSerializer,
)

RESEND_PAUSE = timedelta(minutes=1)  # a new code for the same email at most once a minute


def error(text, status=400, **extra):
    return Response({"detail": text, **extra}, status=status)


def make_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def logged_in(user, status=200):
    return Response({"user": UserSerializer(user).data, **make_tokens(user)}, status=status)


def email_code(email, purpose):
    """Sends a code unless one was sent less than a minute ago. Returns an error Response, or None when sent."""
    old = EmailCode.objects.filter(email=email).first()
    if old and timezone.now() - old.sent_at < RESEND_PAUSE:
        return error("A code was just sent. Wait a minute before asking for a new one.", 429)
    try:
        send_code(email, purpose)
    except OSError:  # the mail server is down or refused us
        return error("The email could not be sent. Try again in a few minutes.", 503)
    return None


def use_code(email, code, purpose):
    """Checks the code; a right code works only once. Returns an error Response, or None when the code is right."""
    entry = EmailCode.objects.filter(email=email, purpose=purpose).first()
    if entry is None or timezone.now() - entry.sent_at > settings.LOGIN_CODE_LIFETIME:
        return error("The code has expired. Ask for a new one.")
    if entry.attempts >= settings.LOGIN_CODE_MAX_ATTEMPTS:
        return error("Too many wrong tries. Ask for a new code.")
    if not check_password(code, entry.code_hash):  # only a hash of the code is stored
        EmailCode.objects.filter(pk=entry.pk).update(attempts=F("attempts") + 1)
        return error("Wrong code.")
    entry.delete()
    return None


class CodeThrottled(APIView):
    """Views that send emails: at most a few codes an hour from one visitor."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login_code"


class RegisterView(CodeThrottled):
    """Step 1 of sign-up: email, password and name. The account waits until the email is confirmed."""

    @swagger_auto_schema(request_body=RegisterSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.filter(email=data["email"]).first()
        if user and user.email_verified:
            return error("This email is already registered. Log in or reset the password.", code="registered")
        if user and not user.is_active:
            return error("This account is blocked.", 403)
        if user is None:
            user = User.objects.create_user(data["email"], data["password"], full_name=data.get("full_name", ""))
        else:  # signed up before but never confirmed: the new password and name count
            user.set_password(data["password"])
            user.full_name = data.get("full_name", "") or user.full_name
            user.save()
        failed = email_code(user.email, "verify")
        if failed and failed.status_code != 429:  # "wait a minute" is fine here: the earlier code still works
            return failed
        return Response({"detail": "Code sent.", "email": user.email}, status=201)


class VerifyEmailView(APIView):
    """Step 2 of sign-up: the code from the email. Confirms the email and logs in."""

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(request_body=CodeSerializer)
    def post(self, request):
        serializer = CodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email, code = serializer.validated_data["email"], serializer.validated_data["code"]
        user = User.objects.filter(email=email).first()
        if user is None:
            return error("The code has expired. Ask for a new one.")
        failed = use_code(email, code, "verify")
        if failed:
            return failed
        if not user.is_active:
            return error("This account is blocked.", 403)
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return logged_in(user, 201)


class ResendCodeView(CodeThrottled):
    """Sends the sign-up code again (only to accounts that are not confirmed yet)."""

    @swagger_auto_schema(request_body=EmailSerializer)
    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"], email_verified=False).first()
        if user is None:
            return error("This email is already confirmed or not registered.")
        return email_code(user.email, "verify") or Response({"detail": "Code sent."})


class LoginView(APIView):
    """Email + password. An account whose email is not confirmed yet gets a new code instead of tokens."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"  # slows down password guessing

    @swagger_auto_schema(request_body=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.filter(email=data["email"]).first()
        if user is None or not user.check_password(data["password"]):
            return error("Wrong email or password.")
        if not user.is_active:
            return error("This account is blocked.", 403)
        if not user.email_verified:
            email_code(user.email, "verify")  # a fresh code, unless one was sent a minute ago
            return error("Confirm your email first. We sent you a code.", 403, code="not_verified")
        return logged_in(user)


class ForgotPasswordView(CodeThrottled):
    """Sends a code for a new password. Answers the same whether the email is registered or not,
    so nobody can use it to find out who has an account."""

    @swagger_auto_schema(request_body=EmailSerializer)
    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data["email"], is_active=True).first()
        if user:
            failed = email_code(user.email, "reset")
            if failed and failed.status_code == 503:
                return failed
        return Response({"detail": "If this email is registered, a code was sent."})


class ResetPasswordView(APIView):
    """The code from the email and a new password. Also confirms the email, and logs in."""

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(request_body=ResetPasswordSerializer)
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = User.objects.filter(email=data["email"], is_active=True).first()
        if user is None:
            return error("The code has expired. Ask for a new one.")
        failed = use_code(data["email"], data["code"], "reset")
        if failed:
            return failed
        user.set_password(data["password"])
        user.email_verified = True
        user.save()
        return logged_in(user)


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
