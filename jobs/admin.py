from django.contrib import admin

from .models import Employer, EmployerReview, Job


@admin.register(Employer)
class EmployerAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "is_verified", "is_blacklisted", "created_at"]
    list_filter = ["is_verified", "is_blacklisted", "city"]
    list_editable = ["is_verified", "is_blacklisted"]
    search_fields = ["name", "inn"]


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ["title", "employer", "city", "industry", "salary_from", "salary_to", "is_active", "expires_at"]
    list_filter = ["industry", "is_active", "housing_provided"]
    search_fields = ["title", "employer__name", "city"]


@admin.register(EmployerReview)
class EmployerReviewAdmin(admin.ModelAdmin):
    list_display = ["employer", "author", "rating", "salary_not_paid", "created_at"]
    list_filter = ["rating", "salary_not_paid"]
