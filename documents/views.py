from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response

from core.permissions import IsAdminOrReadOnly, is_admin
from .filters import (
    DocumentTypeFilter, ExamQuestionFilter, GuideStepFilter, LawNewsFilter, MigrationCenterFilter, PaymentFilter,
    RegionFilter, UserDocumentFilter,
)
from .models import (
    DocumentType, ExamQuestion, GuideStep, LawNews, MigrationCenter, Payment, Region, UserDocument, add_months,
)
from .serializers import (
    DocumentPhotoSerializer, DocumentTypeSerializer, ExamQuestionSerializer, GuideStepSerializer, LawNewsSerializer,
    MigrationCenterSerializer, PaymentSerializer, RegionSerializer, UserDocumentSerializer,
)


class DocumentTypeViewSet(viewsets.ModelViewSet):
    queryset = DocumentType.objects.all()
    serializer_class = DocumentTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = DocumentTypeFilter


class GuideStepViewSet(viewsets.ModelViewSet):
    queryset = GuideStep.objects.all()
    serializer_class = GuideStepSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = GuideStepFilter


class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = RegionFilter


class UserDocumentViewSet(viewsets.ModelViewSet):
    """The user's own documents; each user sees and changes only theirs."""

    serializer_class = UserDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = UserDocumentFilter
    ordering_fields = ["expires_at", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return UserDocument.objects.none()
        return UserDocument.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, document):
        document.photo.delete(save=False)
        document.delete()

    @action(detail=True, methods=["get", "post", "delete"], parser_classes=[MultiPartParser])
    def photo(self, request, pk=None):
        """GET: the photo of the document (only for its owner). POST: upload a new one. DELETE: remove it."""
        document = self.get_object()
        if request.method == "GET":
            if not document.photo:
                raise Http404
            return FileResponse(document.photo.open("rb"))
        if request.method == "DELETE":
            document.photo.delete(save=True)
            return Response(status=204)
        serializer = DocumentPhotoSerializer(document, data=request.data)
        serializer.is_valid(raise_exception=True)
        document.photo.delete(save=False)  # the old photo is not kept
        serializer.save()
        return Response(UserDocumentSerializer(document).data)


class PaymentViewSet(viewsets.ModelViewSet):
    """The user's payments and receipts (the receipts archive). Send as multipart to attach the receipt file.
    A new payment moves the document's end date forward by the months paid."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser]
    filterset_class = PaymentFilter
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        return Payment.objects.filter(user=self.request.user).select_related("document__document_type")

    def perform_create(self, serializer):
        payment = serializer.save(user=self.request.user)
        document = payment.document
        document.expires_at = add_months(document.expires_at, payment.months)
        document.save(update_fields=["expires_at", "updated_at"])

    def perform_destroy(self, payment):
        payment.receipt.delete(save=False)
        payment.delete()

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        """The receipt file of the payment (only for its owner)."""
        payment = self.get_object()
        if not payment.receipt:
            raise Http404
        return FileResponse(payment.receipt.open("rb"))


class MigrationCenterViewSet(viewsets.ModelViewSet):
    queryset = MigrationCenter.objects.select_related("region")
    serializer_class = MigrationCenterSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = MigrationCenterFilter


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
    filterset_class = LawNewsFilter

    def get_queryset(self):
        qs = LawNews.objects.all()
        return qs if is_admin(self.request.user) else qs.filter(is_published=True)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, **publish_date(serializer))

    def perform_update(self, serializer):
        serializer.save(**publish_date(serializer))


class ExamQuestionViewSet(viewsets.ModelViewSet):
    """Practice questions for the patent exam. Everyone reads the active ones; admins manage them."""

    serializer_class = ExamQuestionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = ExamQuestionFilter

    def get_queryset(self):
        qs = ExamQuestion.objects.all()
        return qs if is_admin(self.request.user) else qs.filter(is_active=True)
