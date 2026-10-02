from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Notification, User, normalize_phone


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        try:
            return normalize_phone(super().to_internal_value(data))
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)


class LowerEmailField(serializers.EmailField):
    def to_internal_value(self, data):
        return super().to_internal_value(data).strip().lower()


class EmailSerializer(serializers.Serializer):
    email = LowerEmailField()


class PasswordField(serializers.CharField):
    """A new password, checked by Django's password rules (length, too common, only digits, like the email)."""

    def __init__(self, **kwargs):
        super().__init__(write_only=True, max_length=128, trim_whitespace=False, **kwargs)


def check_password_rules(password, email=""):
    try:
        validate_password(password, user=User(email=email))
    except DjangoValidationError as e:
        raise serializers.ValidationError({"password": e.messages})


class RegisterSerializer(serializers.Serializer):
    email = LowerEmailField()
    password = PasswordField()
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate(self, attrs):
        check_password_rules(attrs["password"], attrs["email"])
        return attrs


class LoginSerializer(serializers.Serializer):
    email = LowerEmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class CodeSerializer(serializers.Serializer):
    email = LowerEmailField()
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "The code is 6 digits."})


class ResetPasswordSerializer(CodeSerializer):
    password = PasswordField()

    def validate(self, attrs):
        check_password_rules(attrs["password"], attrs["email"])
        return attrs


class UserSerializer(serializers.ModelSerializer):
    phone = PhoneField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "email", "phone", "full_name", "role", "language", "city", "email_reminders", "date_joined"]
        read_only_fields = ["id", "email", "role", "date_joined"]

    def validate_phone(self, phone):
        if not phone:
            return None
        if User.objects.filter(phone=phone).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError("This phone number is already used by another account.")
        return phone


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "kind", "title", "message", "created_at"]
