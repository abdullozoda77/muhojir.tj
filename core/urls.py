from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

from .dashboard import install as install_dashboard

schema_view = get_schema_view(
    openapi.Info(
        title="Muhojir API",
        default_version="v1",
        description="API for Tajik migrants in Russia: documents and deadlines, patent prices, guides and real jobs",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

install_dashboard()  # before admin.site.urls is read below

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/documents/", include("documents.urls")),
    path("api/jobs/", include("jobs.urls")),
    path("api/help/", include("support.urls")),
    re_path(r"^swagger/$", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    re_path(r"^redoc/$", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "Muhojir"
admin.site.site_title = "Muhojir"
