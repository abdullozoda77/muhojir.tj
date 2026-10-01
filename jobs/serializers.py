from rest_framework import serializers

from .models import Employer, EmployerReview, Job, JobApplication, Resume


class EmployerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = [
            "id", "owner", "name", "inn", "city", "phone", "description", "website", "source", "is_verified", "verified_at",
            "is_blacklisted", "blacklist_reason", "created_at",
        ]
        read_only_fields = [
            "id", "owner", "website", "source", "is_verified", "verified_at", "is_blacklisted", "blacklist_reason", "created_at",
        ]


class EmployerShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employer
        fields = ["id", "name", "city", "is_verified", "is_blacklisted", "source"]


class JobSerializer(serializers.ModelSerializer):
    employer = EmployerShortSerializer(read_only=True)
    industry_label = serializers.CharField(source="get_industry_display", read_only=True)

    class Meta:
        model = Job
        fields = [
            "id", "employer", "title", "description", "industry", "industry_label", "city", "address",
            "salary_from", "salary_to", "salary_period", "schedule", "housing_provided", "meals_provided",
            "helps_with_documents", "is_active", "promoted_until", "expires_at", "source", "external_url", "created_at",
            "updated_at",
        ]
        # Promotion is paid, so only admins set it (through the admin panel). Source fields belong to the import.
        read_only_fields = ["id", "promoted_until", "source", "external_url", "created_at", "updated_at"]

    def validate(self, attrs):
        low = attrs.get("salary_from", getattr(self.instance, "salary_from", None))
        high = attrs.get("salary_to", getattr(self.instance, "salary_to", None))
        if low is not None and high is not None and high < low:
            raise serializers.ValidationError({"salary_to": "The top of the salary range is below the bottom."})
        return attrs


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
        if employer.owner_id == request.user.id:
            raise serializers.ValidationError("You cannot review your own company.")
        if not self.instance and EmployerReview.objects.filter(employer=employer, author=request.user).exists():
            raise serializers.ValidationError("You already reviewed this employer. Edit that review instead.")
        return employer


class ResumeSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="user.phone", read_only=True)
    industry_label = serializers.CharField(source="get_industry_display", read_only=True)

    class Meta:
        model = Resume
        fields = [
            "id", "full_name", "phone", "birth_year", "city", "industry", "industry_label", "profession",
            "experience_years", "russian_level", "has_patent", "about", "is_visible", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    employer_name = serializers.CharField(source="job.employer.name", read_only=True)
    resume = ResumeSerializer(source="applicant.resume", read_only=True, default=None)
    # Only the worker and the job's employer ever see an application, and by applying the worker asked
    # that employer to contact them, so the contacts are there even when the worker has no resume.
    applicant_name = serializers.CharField(source="applicant.full_name", read_only=True)
    applicant_phone = serializers.CharField(source="applicant.phone", read_only=True, default=None)
    applicant_email = serializers.EmailField(source="applicant.email", read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            "id", "job", "job_title", "employer_name", "applicant_name", "applicant_phone", "applicant_email", "resume",
            "message", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
