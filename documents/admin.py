from django.contrib import admin

from core.admin_access import EditorAccess, EditorChangeOnly

from .models import (
    DocumentType, ExamQuestion, GuideStep, LawNews, MigrationCenter, Payment, Region, ReminderLog, UserDocument,
)


class GuideStepInline(EditorAccess, admin.StackedInline):
    model = GuideStep
    extra = 0


@admin.register(DocumentType)
class DocumentTypeAdmin(EditorChangeOnly, admin.ModelAdmin):
    list_display = ["title", "slug", "default_validity_days", "order"]
    prepopulated_fields = {"slug": ["title"]}
    inlines = [GuideStepInline]


@admin.register(Region)
class RegionAdmin(EditorAccess, admin.ModelAdmin):
    list_display = ["name", "patent_monthly_price", "price_year"]
    list_editable = ["patent_monthly_price", "price_year"]
    search_fields = ["name"]


@admin.register(UserDocument)
class UserDocumentAdmin(admin.ModelAdmin):
    list_display = ["user", "document_type", "expires_at", "region"]
    list_filter = ["document_type", "region"]
    search_fields = ["user__email", "user__full_name", "number"]
    date_hierarchy = "expires_at"


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ["user_document", "days_before", "expires_at", "sent_at"]


@admin.register(LawNews)
class LawNewsAdmin(EditorAccess, admin.ModelAdmin):
    list_display = ["title", "is_published", "published_at"]
    list_filter = ["is_published", "document_types"]
    search_fields = ["title", "summary"]
    filter_horizontal = ["document_types"]
    exclude = ["created_by"]

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["document", "user", "months", "amount", "paid_at"]
    list_filter = ["paid_at"]
    search_fields = ["user__email", "note"]
    # Receipts are private files; admins see only whether one was attached.
    exclude = ["receipt"]


@admin.register(MigrationCenter)
class MigrationCenterAdmin(EditorAccess, admin.ModelAdmin):
    list_display = ["name", "region", "address", "working_hours", "phone", "order"]
    list_filter = ["region"]
    list_editable = ["order"]
    search_fields = ["name", "address"]


@admin.register(ExamQuestion)
class ExamQuestionAdmin(EditorAccess, admin.ModelAdmin):
    list_display = ["question", "section", "answer", "is_active", "order"]
    list_filter = ["section", "is_active"]
    list_editable = ["is_active", "order"]
    search_fields = ["question"]
