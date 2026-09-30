from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.permissions import IsEmployer, IsOwnerOrAdminOrReadOnly, is_admin
from .models import Employer, EmployerReview, Job, JobApplication, Resume
from .serializers import (
    EmployerReviewSerializer, EmployerSerializer, JobApplicationSerializer, JobSerializer, ResumeSerializer,
)


def open_jobs():
    """Q for jobs workers may see and apply to: switched on, not expired, and not from a blacklisted company."""
    return Q(is_active=True, expires_at__gt=timezone.now(), employer__is_blacklisted=False)


class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    owner_field = "owner_id"
    filterset_fields = ["city", "is_verified", "is_blacklisted"]
    search_fields = ["name", "description"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsEmployer()]
        return [permissions.IsAuthenticatedOrReadOnly(), IsOwnerOrAdminOrReadOnly()]

    def perform_create(self, serializer):
        if Employer.objects.filter(owner=self.request.user).exists():
            raise ValidationError({"detail": "You already have a company profile."})
        serializer.save(owner=self.request.user)


class JobViewSet(viewsets.ModelViewSet):
    """Workers see only open jobs. A company also sees its own closed ones, admins see everything."""

    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "employer.owner_id"
    filterset_fields = ["city", "industry", "employer", "housing_provided", "is_active"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "salary_from", "salary_to"]

    def get_queryset(self):
        qs = Job.objects.select_related("employer")
        user = self.request.user
        if is_admin(user):
            return qs
        visible = open_jobs()
        if user.is_authenticated:
            visible |= Q(employer__owner=user)
        return qs.filter(visible)

    def perform_create(self, serializer):
        employer = Employer.objects.filter(owner=self.request.user).first()
        if employer is None:
            raise ValidationError({"detail": "Create a company profile before posting jobs."})
        if employer.is_blacklisted:
            raise PermissionDenied("Your company is on the blacklist and cannot post jobs.")
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
    """Resumes hold names and phone numbers, so only employers see them, and only the visible ones.
    A worker always sees their own resume, admins see all."""

    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    owner_field = "user_id"
    filterset_fields = ["city", "industry", "has_patent"]
    search_fields = ["profession", "about"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Resume.objects.none()
        qs = Resume.objects.select_related("user")
        user = self.request.user
        if is_admin(user):
            return qs
        if user.role == "employer":
            return qs.filter(Q(is_visible=True) | Q(user=user))
        return qs.filter(user=user)

    def perform_create(self, serializer):
        if Resume.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a resume. Edit it instead."})
        serializer.save(user=self.request.user)


class JobApplicationViewSet(viewsets.ModelViewSet):
    """A user sees the applications they sent and the ones sent to their company's jobs.
    The worker may change only the message and withdraw it; the employer changes only the status."""

    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["job", "status"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return JobApplication.objects.none()
        user = self.request.user
        return JobApplication.objects.filter(Q(applicant=user) | Q(job__employer__owner=user)).select_related("job__employer")

    def perform_create(self, serializer):
        job, user = serializer.validated_data["job"], self.request.user
        if job.employer.owner_id == user.id:
            raise ValidationError({"job": "You cannot apply to your own company's job."})
        if not Job.objects.filter(open_jobs(), pk=job.pk).exists():
            raise ValidationError({"job": "This job is closed."})
        if JobApplication.objects.filter(job=job, applicant=user).exists():
            raise ValidationError({"detail": "You already applied for this job."})
        serializer.save(applicant=user, status="sent")

    def perform_update(self, serializer):
        application = serializer.instance
        allowed = {"status"} if application.job.employer.owner_id == self.request.user.id else {"message"}
        # A PUT sends every field, so only the ones whose value really changes count.
        changed = {f for f, v in serializer.validated_data.items() if getattr(application, f) != v} - allowed
        if changed:
            raise PermissionDenied(f"You cannot change: {', '.join(sorted(changed))}.")
        serializer.save()

    def perform_destroy(self, application):
        # Employers answer with the "rejected" status instead, so the worker still sees what happened.
        if application.applicant_id != self.request.user.id:
            raise PermissionDenied("Only the worker who applied can withdraw the application.")
        application.delete()
