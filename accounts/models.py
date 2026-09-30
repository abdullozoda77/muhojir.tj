import re

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def normalize_phone(value):
    """"+7 (999) 123-45-67" -> "+79991234567". Russian (+7) and Tajik (+992) numbers are the usual ones,
    but any international number with 10-15 digits is accepted."""
    digits = re.sub(r"\D", "", value or "")
    # People in Russia often type 8XXXXXXXXXX instead of +7XXXXXXXXXX.
    if len(digits) == 11 and digits.startswith("8"):
        digits = "7" + digits[1:]
    if not 10 <= len(digits) <= 15:
        raise ValidationError("Enter the phone number with the country code, e.g. +79991234567.")
    return "+" + digits


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra):
        user = self.model(phone=normalize_phone(phone), **extra)
        if password:
            user.set_password(password)
        else:
            # Normal users log in with an SMS code, so they have no password at all.
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role="admin")
        return self.create_user(phone, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    # migrant: documents, reminders, resume, job applications, reviews of employers.
    # employer: also a company profile and job ads.
    # admin: everything, including verifying employers, the blacklist and news.
    ROLES = (("migrant", "Migrant"), ("employer", "Employer"), ("admin", "Admin"))
    LANGUAGES = (("tg", "Тоҷикӣ"), ("ru", "Русский"))

    phone = models.CharField(max_length=16, unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLES, default="migrant")
    language = models.CharField(max_length=2, choices=LANGUAGES, default="tg")
    # City in Russia where the person lives now; jobs and news are shown for it first.
    city = models.CharField(max_length=100, blank=True)
    sms_reminders = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    def clean(self):
        super().clean()
        try:
            self.phone = normalize_phone(self.phone)
        except ValidationError as e:
            raise ValidationError({"phone": e.messages})

    def __str__(self):
        return self.full_name or self.phone


class PhoneCode(models.Model):
    """The 6-digit login code sent by SMS. Only a hash is stored, like a password; asking for a new code
    replaces the old one. It is keyed by phone, not user, because the first code creates the account."""

    phone = models.CharField(max_length=16, unique=True)
    code_hash = models.CharField(max_length=128)
    sent_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)  # wrong tries with this code

    def __str__(self):
        return self.phone


class Notification(models.Model):
    KINDS = (("reminder", "Document reminder"), ("job", "Job"), ("news", "News"), ("system", "System"))

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=KINDS, default="system")
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
