from django.contrib import admin

from .models import HelpContact, LegalQuestion


@admin.register(HelpContact)
class HelpContactAdmin(admin.ModelAdmin):
    list_display = ["title", "kind", "phone", "region", "order", "is_active"]
    list_filter = ["kind", "is_active", "region"]
    list_editable = ["order", "is_active"]
    search_fields = ["title", "phone", "description"]


@admin.register(LegalQuestion)
class LegalQuestionAdmin(admin.ModelAdmin):
    list_display = ["question", "user", "document_type", "status", "created_at"]
    list_filter = ["status", "document_type"]
    search_fields = ["question", "answer", "user__email"]
    readonly_fields = ["user", "document_type", "question", "answered_by", "answered_at", "created_at"]
    fields = ["user", "document_type", "question", "status", "answer", "answered_by", "answered_at", "created_at"]

    def save_model(self, request, obj, form, change):
        # Writing an answer in the admin panel also marks it answered and notifies the worker.
        if "answer" in form.changed_data and obj.answer.strip():
            obj.save_answer(obj.answer, request.user)
        else:
            super().save_model(request, obj, form, change)
