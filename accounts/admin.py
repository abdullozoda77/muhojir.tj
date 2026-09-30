from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm as BaseUserChangeForm

from .models import Notification, PhoneCode, User


class UserCreationForm(BaseUserCreationForm):
    class Meta:
        model = User
        fields = ("phone", "full_name", "role")


class UserChangeForm(BaseUserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    ordering = ["-date_joined"]
    list_display = ["phone", "full_name", "role", "city", "is_active", "date_joined"]
    list_filter = ["role", "language", "is_active", "is_staff"]
    search_fields = ["phone", "full_name", "city"]
    fieldsets = (
        (None, {"fields": ("phone", "password")}),
        ("Profile", {"fields": ("full_name", "role", "language", "city", "sms_reminders")}),
        ("Access", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("phone", "full_name", "role", "password1", "password2")}),)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "kind", "is_read", "created_at"]
    list_filter = ["kind", "is_read"]
    search_fields = ["title", "user__phone"]


@admin.register(PhoneCode)
class PhoneCodeAdmin(admin.ModelAdmin):
    list_display = ["phone", "sent_at", "attempts"]
    readonly_fields = ["phone", "code_hash", "sent_at", "attempts"]
