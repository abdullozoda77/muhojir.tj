from datetime import date

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from core.files import document_photo_path, file_validators, private_storage


class DocumentType(models.Model):
    """A kind of paper a migrant needs: patent, migration registration, migration card, insurance, medical check."""

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    # How long a new document of this kind is usually valid; used to suggest the end date. Empty = it varies.
    default_validity_days = models.PositiveIntegerField(blank=True, null=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class GuideStep(models.Model):
    """One step of the step-by-step guide for a document type."""

    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200)
    body = models.TextField()
    required_papers = models.TextField(blank=True)  # what to bring, one item per line
    cost_note = models.CharField(max_length=200, blank=True)
    deadline_note = models.CharField(max_length=200, blank=True)  # e.g. "within 30 days of entry"
    official_url = models.URLField(blank=True)

    class Meta:
        ordering = ["document_type", "order"]
        constraints = [models.UniqueConstraint(fields=["document_type", "order"], name="unique_step_order")]

    def __str__(self):
        return f"{self.document_type} — {self.order}. {self.title}"


class Region(models.Model):
    """A region of Russia with its monthly patent price (the NDFL advance). Admins update prices each January."""

    name = models.CharField(max_length=100, unique=True)
    patent_monthly_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    price_year = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserDocument(models.Model):
    """A document the user holds, with its end date. Reminders are sent before it runs out."""

    REMIND_CHOICES = [(30, "30 days before"), (14, "14 days before"), (7, "7 days before"), (3, "3 days before"), (1, "1 day before")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents")
    document_type = models.ForeignKey(DocumentType, on_delete=models.PROTECT, related_name="user_documents")
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, blank=True, null=True, related_name="user_documents")
    number = models.CharField(max_length=50, blank=True)
    issued_at = models.DateField(blank=True, null=True)
    expires_at = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    # The owner's reminder comes this many days before the end date, and one more the day before.
    remind_days_before = models.PositiveSmallIntegerField(choices=REMIND_CHOICES, default=7)
    photo = models.FileField(upload_to=document_photo_path, storage=private_storage, validators=file_validators, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["expires_at"]

    @property
    def days_left(self):
        return (self.expires_at - date.today()).days

    @property
    def status(self):
        days = self.days_left
        if days < 0:
            return "expired"
        if days <= max(settings.REMINDER_DAYS):
            return "expiring"
        return "valid"

    def __str__(self):
        return f"{self.document_type} ({self.user}) until {self.expires_at}"


class ReminderLog(models.Model):
    """Remembers which reminders were already sent, so the daily job never sends the same one twice.
    The end date is part of the key: after the user renews a document, its reminders start again."""

    user_document = models.ForeignKey(UserDocument, on_delete=models.CASCADE, related_name="reminders")
    expires_at = models.DateField()
    days_before = models.PositiveSmallIntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user_document", "expires_at", "days_before"], name="unique_reminder"),
        ]


class LawNews(models.Model):
    """News about migration law, written in Tajik."""

    title = models.CharField(max_length=255)
    summary = models.CharField(max_length=500)
    body = models.TextField()
    source_url = models.URLField(blank=True)
    document_types = models.ManyToManyField(DocumentType, blank=True, related_name="news")
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name_plural = "law news"

    def __str__(self):
        return self.title
