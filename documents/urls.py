from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DocumentTypeViewSet, GuideStepViewSet, LawNewsViewSet, MigrationCenterViewSet, PaymentViewSet, RegionViewSet,
    UserDocumentViewSet,
)

router = DefaultRouter()
router.register("document-types", DocumentTypeViewSet, basename="document-types")
router.register("guide-steps", GuideStepViewSet, basename="guide-steps")
router.register("regions", RegionViewSet, basename="regions")
router.register("my-documents", UserDocumentViewSet, basename="my-documents")
router.register("news", LawNewsViewSet, basename="news")
router.register("payments", PaymentViewSet, basename="payments")
router.register("centers", MigrationCenterViewSet, basename="centers")

urlpatterns = [
    path("", include(router.urls)),
]
