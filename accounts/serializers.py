from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Notification, User, normalize_phone


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        try:
            return normalize_phone(super().to_internal_value(data))
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)


class SendCodeSerializer(serializers.Serializer):
    phone = PhoneField()


class VerifyCodeSerializer(serializers.Serializer):
    phone = PhoneField()
    code = serializers.RegexField(r"^\d{6}$", error_messages={"invalid": "The code is 6 digits."})
    # Only used when this code creates the account.
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=["migrant", "employer"], required=False, default="migrant")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone", "full_name", "role", "language", "city", "sms_reminders", "date_joined"]
        read_only_fields = ["id", "phone", "role", "date_joined"]


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "kind", "title", "message", "created_at"]
