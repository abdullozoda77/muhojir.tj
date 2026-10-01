import django_filters
from django.db.models import Q

from .models import Notification


class NotificationFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Notification
        fields = ["kind", "is_read"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(title__icontains=value) | Q(message__icontains=value))
