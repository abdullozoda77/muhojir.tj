from django.conf import settings
from django.db import models
from django.utils import timezone

from accounts.notify import notify


class HelpContact(models.Model):
    """Where a migrant can get help: official sites to read about the patent, the embassy, a hotline, a lawyer,
    or the official MVD check page.
    Admins add them (with real, checked numbers and links); the site shows them in the help center."""

    KINDS = (
        ("info", "Official site to read"),
        ("embassy", "Embassy / consulate"),
        ("hotline", "Hotline"),
        ("lawyer", "Lawyer"),
        ("mvd_check", "Official MVD check page"),
        ("other", "Other"),
    )

    kind = models.CharField(max_length=20, choices=KINDS, default="other")
    title = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    region = models.ForeignKey("documents.Region", on_delete=models.SET_NULL, blank=True, null=True, related_name="help_contacts")
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class LegalQuestion(models.Model):
    """A worker's question to a lawyer. An admin writes the answer; the worker gets a notification."""

    STATUSES = (("new", "New"), ("answered", "Answered"), ("closed", "Closed"))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="legal_questions")
    document_type = models.ForeignKey("documents.DocumentType", on_delete=models.SET_NULL, blank=True, null=True, related_name="+")
    question = models.TextField()
    status = models.CharField(max_length=10, choices=STATUSES, default="new")
    answer = models.TextField(blank=True)
    answered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name="+")
    answered_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.question[:60]

    def save_answer(self, answer, lawyer):
        """Saves the lawyer's answer and tells the worker about it."""
        self.answer = answer
        self.status = "answered"
        self.answered_by = lawyer
        self.answered_at = timezone.now()
        self.save()
        notify(self.user, "Ҷавоби ҳуқуқшинос", f"Ба саволи шумо ҷавоб доданд:\n\n{answer}", kind="system")
