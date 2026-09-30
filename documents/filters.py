import django_filters
from django.db.models import Q

from .models import DocumentType, GuideStep, LawNews, MigrationCenter, Payment, Region, UserDocument

# Every filter has ?search=... that looks for the words in the main text fields (case does not matter).


class DocumentTypeFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = DocumentType
        fields = ["slug"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(description__icontains=value))


class GuideStepFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = GuideStep
        fields = ["document_type"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(body__icontains=value) | Q(required_papers__icontains=value))


class RegionFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    min_price = django_filters.NumberFilter(field_name="patent_monthly_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="patent_monthly_price", lookup_expr="lte")

    class Meta:
        model = Region
        fields = ["price_year"]


class UserDocumentFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    # Documents that end in this period: ?expires_after=2026-10-01&expires_before=2026-10-31
    expires_after = django_filters.DateFilter(field_name="expires_at", lookup_expr="gte")
    expires_before = django_filters.DateFilter(field_name="expires_at", lookup_expr="lte")

    class Meta:
        model = UserDocument
        fields = ["document_type", "region"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(number__icontains=value) | Q(note__icontains=value) | Q(document_type__title__icontains=value))


class LawNewsFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    document_type = django_filters.NumberFilter(field_name="document_types")

    class Meta:
        model = LawNews
        fields = ["document_type"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(summary__icontains=value) | Q(body__icontains=value))


class PaymentFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="note", lookup_expr="icontains")
    paid_after = django_filters.DateFilter(field_name="paid_at", lookup_expr="gte")
    paid_before = django_filters.DateFilter(field_name="paid_at", lookup_expr="lte")

    class Meta:
        model = Payment
        fields = ["document"]


class MigrationCenterFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = MigrationCenter
        fields = ["region"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(name__icontains=value) | Q(address__icontains=value))
