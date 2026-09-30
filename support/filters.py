import django_filters
from django.db.models import Q

from .models import HelpContact, LegalQuestion


class HelpContactFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = HelpContact
        fields = ["kind", "region"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(description__icontains=value) | Q(phone__icontains=value))


class LegalQuestionFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = LegalQuestion
        fields = ["status", "document_type"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(question__icontains=value) | Q(answer__icontains=value))
