import django_filters
from django.db.models import Q

from .models import Employer, EmployerReview, Job

# Every filter has ?search=... that looks for the words in the main text fields (case does not matter).


class EmployerFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Employer
        fields = ["city", "is_verified", "is_blacklisted"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(name__icontains=value) | Q(description__icontains=value) | Q(inn__icontains=value))


class JobFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    city = django_filters.CharFilter(lookup_expr="icontains")
    # Jobs that pay at least this much: ?min_salary=90000
    min_salary = django_filters.NumberFilter(method="filter_min_salary")
    # Only the jobs the viewer saved: ?saved=true
    saved = django_filters.BooleanFilter(method="filter_saved")

    class Meta:
        model = Job
        fields = [
            "city", "industry", "employer", "salary_period", "housing_provided", "meals_provided",
            "helps_with_documents", "is_active",
        ]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(description__icontains=value) | Q(employer__name__icontains=value))

    def filter_saved(self, queryset, name, value):
        user = getattr(self.request, "user", None)
        if not value:
            return queryset
        if not user or not user.is_authenticated:
            return queryset.none()
        return queryset.filter(saved_by__user=user)

    def filter_min_salary(self, queryset, name, value):
        # The top of the range counts; a job with only "from" is compared by that.
        return queryset.filter(Q(salary_to__gte=value) | Q(salary_to__isnull=True, salary_from__gte=value))


class EmployerReviewFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="text", lookup_expr="icontains")
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")

    class Meta:
        model = EmployerReview
        fields = ["employer", "rating", "salary_not_paid"]
