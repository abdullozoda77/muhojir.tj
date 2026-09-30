from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployerReviewViewSet, EmployerViewSet, JobApplicationViewSet, JobViewSet, ResumeViewSet

router = DefaultRouter()
router.register("employers", EmployerViewSet, basename="employers")
router.register("jobs", JobViewSet, basename="jobs")
router.register("reviews", EmployerReviewViewSet, basename="reviews")
router.register("resumes", ResumeViewSet, basename="resumes")
router.register("applications", JobApplicationViewSet, basename="applications")

urlpatterns = [
    path("", include(router.urls)),
]
