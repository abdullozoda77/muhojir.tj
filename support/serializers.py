from rest_framework import serializers

from .models import HelpContact, LegalQuestion


class HelpContactSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True, default=None)

    class Meta:
        model = HelpContact
        fields = ["id", "kind", "title", "phone", "website", "description", "region", "region_name", "order", "is_active"]


class LegalQuestionSerializer(serializers.ModelSerializer):
    """For the worker: they write the question; the answer and status are set by the lawyer."""

    document_type_title = serializers.CharField(source="document_type.title", read_only=True, default=None)

    class Meta:
        model = LegalQuestion
        fields = ["id", "document_type", "document_type_title", "question", "status", "answer", "answered_at", "created_at"]
        read_only_fields = ["id", "status", "answer", "answered_at", "created_at"]


class LegalAnswerSerializer(serializers.Serializer):
    """For the lawyer (admin): the answer, or just a new status (e.g. closed)."""

    answer = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=LegalQuestion.STATUSES, required=False)
