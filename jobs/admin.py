from django.contrib import admin

from .models import Employer, EmployerReview, Job, JobApplication, Resume


@admin.register(Employer)
class EmployerAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "owner", "source", "is_verified", "is_blacklisted", "created_at"]
    list_filter = ["source", "is_verified", "is_blacklisted", "city"]
    list_editable = ["is_verified", "is_blacklisted"]
    search_fields = ["name", "inn", "owner__email"]


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ["title", "employer", "city", "industry", "salary_from", "salary_to", "source", "is_active", "promoted_until"]
    list_filter = ["source", "industry", "is_active", "housing_provided"]
    search_fields = ["title", "employer__name", "city"]


@admin.register(EmployerReview)
class EmployerReviewAdmin(admin.ModelAdmin):
    list_display = ["employer", "author", "rating", "salary_not_paid", "created_at"]
    list_filter = ["rating", "salary_not_paid"]


@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ["full_name", "profession", "city", "industry", "has_patent", "is_visible"]
    list_filter = ["industry", "has_patent", "is_visible"]
    search_fields = ["full_name", "profession", "user__email"]


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ["applicant", "job", "status", "created_at"]
    list_filter = ["status"]
