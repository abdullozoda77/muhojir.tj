from rest_framework import serializers

from .models import Employer, EmployerReview, Job, JobAlert


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = [
            "id", "name", "inn", "city", "description", "website", "source", "is_verified", "verified_at",
            "is_blacklisted", "blacklist_reason", "created_at",
        ]


class EmployerShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ["id", "name", "city", "website", "is_verified", "is_blacklisted", "source"]


class JobSerializer(serializers.ModelSerializer):
    employer = EmployerShortSerializer(read_only=True)
    industry_label = serializers.CharField(source="get_industry_display", read_only=True)
    # Saved by the viewer (always false for guests); filled in by the view with one query.
    is_saved = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Job
        fields = [
            "id", "employer", "title", "description", "industry", "industry_label", "city", "address",
            "salary_from", "salary_to", "salary_period", "schedule", "housing_provided", "meals_provided",
            "helps_with_documents", "is_active", "expires_at", "source", "external_url", "is_saved", "created_at",
            "updated_at",
        ]


class EmployerReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    # Lets the site show edit/delete on the viewer's own review without revealing who wrote the others.
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = EmployerReview
        fields = ["id", "employer", "author_name", "is_mine", "rating", "text", "salary_not_paid", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.author_id == request.user.id)

    def get_author_name(self, obj):
        # Only the first name: workers are afraid of employers finding out who complained.
        name = (obj.author.full_name or "").split()
        return name[0] if name else "Корбар"

    def validate_employer(self, employer):
        request = self.context["request"]
        if self.instance and self.instance.employer_id != employer.id:
            raise serializers.ValidationError("A review cannot be moved to another employer.")
        if not self.instance and EmployerReview.objects.filter(employer=employer, author=request.user).exists():
            raise serializers.ValidationError("You already reviewed this employer. Edit that review instead.")
        return employer


class JobAlertSerializer(serializers.ModelSerializer):
    industry_label = serializers.CharField(source="get_industry_display", read_only=True)

    class Meta:
        model = JobAlert
        fields = [
            "id", "search", "city", "industry", "industry_label", "min_salary", "housing_provided", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        fields = ("search", "city", "industry", "min_salary", "housing_provided")
        values = {f: attrs.get(f, getattr(self.instance, f, None)) for f in fields}
        if not any(values.values()):
            raise serializers.ValidationError({"detail": "Choose at least one filter for the alert."})
        return attrs
