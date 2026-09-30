from rest_framework import permissions, viewsets

from core.permissions import IsAdminOrReadOnly
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


class LawNewsViewSet(viewsets.ModelViewSet):
    queryset = LawNews.objects.all()
    serializer_class = LawNewsSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ["title", "summary"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
