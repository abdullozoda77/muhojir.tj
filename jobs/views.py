from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError

from core.permissions import IsOwnerOrAdminOrReadOnly
from .models import Employer, EmployerReview, Job, JobApplication, Resume
from .serializers import (
    EmployerReviewSerializer, EmployerSerializer, JobApplicationSerializer, JobSerializer, ResumeSerializer,
)


class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "owner_id"
    filterset_fields = ["city", "is_verified", "is_blacklisted"]
    search_fields = ["name", "description"]

    def perform_create(self, serializer):
        if Employer.objects.filter(owner=self.request.user).exists():
            raise ValidationError({"detail": "You already have a company profile."})
        serializer.save(owner=self.request.user)


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related("employer")
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "employer.owner_id"
    filterset_fields = ["city", "industry", "employer", "housing_provided", "is_active"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "salary_from", "salary_to"]

    def perform_create(self, serializer):
        employer = Employer.objects.filter(owner=self.request.user).first()
        if employer is None:
            raise ValidationError({"detail": "Create a company profile before posting jobs."})
        serializer.save(employer=employer)


class EmployerReviewViewSet(viewsets.ModelViewSet):
    queryset = EmployerReview.objects.select_related("author")
    serializer_class = EmployerReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "author_id"
    filterset_fields = ["employer", "rating", "salary_not_paid"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ResumeViewSet(viewsets.ModelViewSet):
    queryset = Resume.objects.select_related("user")
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "user_id"
    filterset_fields = ["city", "industry", "has_patent"]
    search_fields = ["profession", "about"]

    def perform_create(self, serializer):
        if Resume.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a resume. Edit it instead."})
        serializer.save(user=self.request.user)


class JobApplicationViewSet(viewsets.ModelViewSet):
    """A user sees the applications they sent and the ones sent to their company's jobs."""

    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["job", "status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return JobApplication.objects.none()
        user = self.request.user
        return JobApplication.objects.filter(Q(applicant=user) | Q(job__employer__owner=user)).select_related("job__employer")

    def perform_create(self, serializer):
        if JobApplication.objects.filter(job=serializer.validated_data["job"], applicant=self.request.user).exists():
            raise ValidationError({"detail": "You already applied for this job."})
        serializer.save(applicant=self.request.user)
