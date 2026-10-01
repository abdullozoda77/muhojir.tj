from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployerReviewViewSet, EmployerViewSet, JobViewSet

router = DefaultRouter()
router.register("employers", EmployerViewSet, basename="employers")
router.register("jobs", JobViewSet, basename="jobs")
router.register("reviews", EmployerReviewViewSet, basename="reviews")

urlpatterns = [
    path("", include(router.urls)),
]
