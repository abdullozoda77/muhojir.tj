from rest_framework import serializers

from .models import (
    DocumentType, ExamQuestion, GuideStep, LawNews, MigrationCenter, Payment, Region, UserDocument,
)


class GuideStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideStep
        fields = [
            "id", "document_type", "order", "title", "body", "required_papers", "cost_note",
            "deadline_note", "official_url", "where", "example",
        ]


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = ["id", "slug", "title", "description", "default_validity_days", "order"]


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "name", "patent_monthly_price", "price_year"]


class UserDocumentSerializer(serializers.ModelSerializer):
    document_type_title = serializers.CharField(source="document_type.title", read_only=True)
    region_name = serializers.CharField(source="region.name", read_only=True, default=None)
    days_left = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    # The photo itself is at /my-documents/<id>/photo/ and only for the owner.
    has_photo = serializers.SerializerMethodField()

    class Meta:
        model = UserDocument
        fields = [
            "id", "document_type", "document_type_title", "region", "region_name", "number", "issued_at",
            "expires_at", "note", "remind_days_before", "has_photo", "days_left", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        issued = attrs.get("issued_at", getattr(self.instance, "issued_at", None))
        expires = attrs.get("expires_at", getattr(self.instance, "expires_at", None))
        if issued and expires and expires <= issued:
            raise serializers.ValidationError({"expires_at": "The end date must be after the issue date."})
        return attrs

    def get_has_photo(self, obj):
        return bool(obj.photo)


class DocumentPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDocument
        fields = ["photo"]
        extra_kwargs = {"photo": {"required": True, "allow_empty_file": False}}


class LawNewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LawNews
        fields = [
            "id", "title", "summary", "body", "source_url", "document_types", "is_published", "published_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PaymentSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source="document.document_type.title", read_only=True)
    # The document's end date after this payment (it moves forward by the months paid).
    document_expires_at = serializers.DateField(source="document.expires_at", read_only=True)
    has_receipt = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "document", "document_title", "document_expires_at", "months", "amount", "paid_at", "receipt",
            "has_receipt", "note", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"receipt": {"write_only": True, "required": False}}

    def get_has_receipt(self, obj):
        return bool(obj.receipt)

    def validate_document(self, document):
        if document.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("This is not your document.")
        return document


class MigrationCenterSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source="region.name", read_only=True, default=None)

    class Meta:
        model = MigrationCenter
        fields = ["id", "region", "region_name", "name", "address", "working_hours", "phone", "website", "order"]


class ExamQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamQuestion
        fields = ["id", "section", "question", "listen_text", "options", "answer", "explanation", "is_active", "order"]

    def validate(self, attrs):
        options = attrs.get("options", getattr(self.instance, "options", None))
        answer = attrs.get("answer", getattr(self.instance, "answer", None))
        if not isinstance(options, list) or len(options) < 2 or not all(isinstance(o, str) and o for o in options):
            raise serializers.ValidationError({"options": "Give at least two answers."})
        if answer is not None and answer >= len(options):
            raise serializers.ValidationError({"answer": "The right answer must be one of the options."})
        return attrs
