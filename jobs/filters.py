import django_filters
from django.db.models import Q

from .models import Employer, EmployerReview, Job, JobApplication, Resume

# Every filter has ?search=... that looks for the words in the main text fields (case does not matter).


class EmployerFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Employer
        fields = ["owner", "city", "is_verified", "is_blacklisted"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(name__icontains=value) | Q(description__icontains=value) | Q(inn__icontains=value))


class JobFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(lookup_expr="icontains")
    # Jobs that pay at least this much: ?min_salary=90000
    min_salary = django_filters.NumberFilter(method="filter_min_salary")

    class Meta:
        model = Job
        fields = [
            "city", "industry", "employer", "salary_period", "housing_provided", "meals_provided",
            "helps_with_documents", "is_active", "source",
        ]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(description__icontains=value) | Q(employer__name__icontains=value))

    def filter_min_salary(self, queryset, name, value):
        # The top of the range counts; a job with only "from" is compared by that.
        return queryset.filter(Q(salary_to__gte=value) | Q(salary_to__isnull=True, salary_from__gte=value))


class EmployerReviewFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="text", lookup_expr="icontains")
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")

    class Meta:
        model = EmployerReview
        fields = ["employer", "rating", "salary_not_paid"]


class ResumeFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(lookup_expr="icontains")
    min_experience = django_filters.NumberFilter(field_name="experience_years", lookup_expr="gte")

    class Meta:
        model = Resume
        fields = ["city", "industry", "russian_level", "has_patent"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(full_name__icontains=value) | Q(profession__icontains=value) | Q(about__icontains=value))


class JobApplicationFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = JobApplication
        fields = ["job", "status"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(job__title__icontains=value) | Q(message__icontains=value) | Q(applicant__full_name__icontains=value)
        )
