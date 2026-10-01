from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.permissions import IsAdminOrReadOnly, IsOwnerOrAdminOrReadOnly, is_admin
from .filters import EmployerFilter, EmployerReviewFilter, JobFilter
from .models import Employer, EmployerReview, Job, JobAlert, SavedJob
from .serializers import EmployerReviewSerializer, EmployerSerializer, JobAlertSerializer, JobSerializer

# Jobs and companies come from the import (python manage.py import_jobs), so on the API they are read-only;
# admins change them (switch off, blacklist) in the admin panel.


def open_jobs():
    """Q for the jobs workers see: switched on, not expired, and not from a blacklisted company."""
    return Q(is_active=True, expires_at__gt=timezone.now(), employer__is_blacklisted=False)


class EmployerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    filterset_class = EmployerFilter


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    """Workers see only open jobs; admins see everything."""

    serializer_class = JobSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = JobFilter
    ordering_fields = ["created_at", "salary_from", "salary_to"]

    def get_queryset(self):
        qs = Job.objects.select_related("employer")
        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(is_saved=Exists(SavedJob.objects.filter(user=user, job=OuterRef("pk"))))
        return qs if is_admin(user) else qs.filter(open_jobs())

    @action(detail=True, methods=["post", "delete"], permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk=None):
        """POST: save the job for later. DELETE: remove it from the saved ones."""
        job = self.get_object()
        if request.method == "POST":
            SavedJob.objects.get_or_create(user=request.user, job=job)
        else:
            SavedJob.objects.filter(user=request.user, job=job).delete()
        return Response({"is_saved": request.method == "POST"})


class EmployerReviewViewSet(viewsets.ModelViewSet):
    queryset = EmployerReview.objects.select_related("author")
    serializer_class = EmployerReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "author_id"
    filterset_class = EmployerReviewFilter

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class JobAlertViewSet(viewsets.ModelViewSet):
    """The user's own alerts about new jobs."""

    serializer_class = JobAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # a user has only a few

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return JobAlert.objects.none()
        return JobAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if JobAlert.objects.filter(user=self.request.user).count() >= 10:
            raise ValidationError({"detail": "You can have at most 10 job alerts."})
        serializer.save(user=self.request.user)
