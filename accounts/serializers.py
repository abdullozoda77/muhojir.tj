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


class SendCodeSerializer(serializers.Serializer):
    email = LowerEmailField()


class VerifyCodeSerializer(serializers.Serializer):
    email = LowerEmailField()
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "The code is 6 digits."})
    # Only used when this code creates the account.
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


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


class PushKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=200)
    auth = serializers.CharField(max_length=100)


class PushSubscribeSerializer(serializers.Serializer):
    # The object the browser gives from pushManager.subscribe(), as it is.
    endpoint = serializers.URLField(max_length=1000)
    keys = PushKeysSerializer(required=False)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "kind", "title", "message", "created_at"]
