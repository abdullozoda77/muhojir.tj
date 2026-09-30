from django.utils import timezone
from rest_framework import permissions, viewsets

from core.permissions import IsAdminOrReadOnly, is_admin
from .models import DocumentType, GuideStep, LawNews, Region, UserDocument
from .serializers import (
    DocumentTypeSerializer, GuideStepSerializer, LawNewsSerializer, RegionSerializer, UserDocumentSerializer,
)


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["title", "description"]


class GuideStepViewSet(viewsets.ModelViewSet):
    queryset = GuideStep.objects.all()
    serializer_class = GuideStepSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["document_type"]


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["name"]


class UserDocumentViewSet(viewsets.ModelViewSet):
    """The user's own documents; each user sees and changes only theirs."""

    serializer_class = UserDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["document_type", "region"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return UserDocument.objects.none()
        return UserDocument.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def publish_date(serializer):
    """News gets today's date the first time it is published, unless the admin picked a date."""
    data, news = serializer.validated_data, serializer.instance
    published = data.get("is_published", getattr(news, "is_published", False))
    has_date = data.get("published_at", getattr(news, "published_at", None))
    return {"published_at": timezone.now()} if published and not has_date else {}


class LawNewsViewSet(viewsets.ModelViewSet):
    """Drafts (is_published off) are seen only by admins."""

    serializer_class = LawNewsSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["title", "summary"]

    def get_queryset(self):
        qs = LawNews.objects.all()
        return qs if is_admin(self.request.user) else qs.filter(is_published=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, **publish_date(serializer))

    def perform_update(self, serializer):
        serializer.save(**publish_date(serializer))
