from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployerReviewViewSet, EmployerViewSet, JobAlertViewSet, JobViewSet

router = DefaultRouter()
router.register("employers", EmployerViewSet, basename="employers")
router.register("jobs", JobViewSet, basename="jobs")
router.register("reviews", EmployerReviewViewSet, basename="reviews")
router.register("alerts", JobAlertViewSet, basename="alerts")

urlpatterns = [
    path("", include(router.urls)),
]
