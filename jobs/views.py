from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets

from core.permissions import IsAdminOrReadOnly, IsOwnerOrAdminOrReadOnly, is_admin
from .filters import EmployerFilter, EmployerReviewFilter, JobFilter
from .models import Employer, EmployerReview, Job
from .serializers import EmployerReviewSerializer, EmployerSerializer, JobSerializer

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
        return qs if is_admin(self.request.user) else qs.filter(open_jobs())


class EmployerReviewViewSet(viewsets.ModelViewSet):
    queryset = EmployerReview.objects.select_related("author")
    serializer_class = EmployerReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    owner_field = "author_id"
    filterset_class = EmployerReviewFilter

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
