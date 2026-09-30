from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HelpContactViewSet, LegalQuestionViewSet

router = DefaultRouter()
router.register("contacts", HelpContactViewSet, basename="help-contacts")
router.register("questions", LegalQuestionViewSet, basename="legal-questions")

urlpatterns = [
    path("", include(router.urls)),
]
