from rest_framework import serializers

from .models import DocumentType, GuideStep, LawNews, Region, UserDocument


class GuideStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideStep
        fields = [
            "id", "document_type", "order", "title", "body", "required_papers", "cost_note",
            "deadline_note", "official_url",
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
