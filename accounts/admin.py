from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm as BaseUserChangeForm

from .models import EmailCode, Notification, User


class UserCreationForm(BaseUserCreationForm):
    class Meta:
        model = User
        fields = ("email", "full_name", "role")


class UserChangeForm(BaseUserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    ordering = ["-date_joined"]
    list_display = ["email", "full_name", "phone", "role", "city", "is_active", "date_joined"]
    list_filter = ["role", "language", "is_active", "is_staff"]
    search_fields = ["email", "phone", "full_name", "city"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "phone", "role", "language", "city", "email_reminders")}),
        ("Access", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "full_name", "role", "password1", "password2")}),)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "kind", "is_read", "created_at"]
    list_filter = ["kind", "is_read"]
    search_fields = ["title", "user__email"]


@admin.register(EmailCode)
class EmailCodeAdmin(admin.ModelAdmin):
    list_display = ["email", "sent_at", "attempts"]
    readonly_fields = ["email", "code_hash", "sent_at", "attempts"]
