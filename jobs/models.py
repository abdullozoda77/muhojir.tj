from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

INDUSTRIES = (
    ("construction", "Сохтмон"),
    ("warehouse", "Анбор"),
    ("delivery", "Расонидан"),
    ("taxi", "Таксӣ ва ронандагӣ"),
    ("trade", "Савдо"),
    ("food", "Ошхона ва қаҳвахона"),
    ("cleaning", "Тозакунӣ"),
    ("agriculture", "Кишоварзӣ"),
    ("manufacturing", "Истеҳсолот"),
    ("other", "Дигар"),
)


def default_job_expiry():
    return timezone.now() + timedelta(days=30)


class Employer(models.Model):
    """A company profile. Admins verify real companies and put the ones that don't pay wages on the blacklist."""

    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employer")
    name = models.CharField(max_length=200)
    inn = models.CharField("INN", max_length=12, blank=True)  # Russian tax number, checked by admins when verifying
    city = models.CharField(max_length=100)
    phone = models.CharField(max_length=16)
    description = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(blank=True, null=True)
    is_blacklisted = models.BooleanField(default=False)
    blacklist_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Job(models.Model):
    PERIODS = (("month", "Per month"), ("day", "Per day"), ("hour", "Per hour"))

    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=200)
    description = models.TextField()
    industry = models.CharField(max_length=20, choices=INDUSTRIES)
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True)
    salary_from = models.PositiveIntegerField(blank=True, null=True)  # rubles
    salary_to = models.PositiveIntegerField(blank=True, null=True)
    salary_period = models.CharField(max_length=10, choices=PERIODS, default="month")
    schedule = models.CharField(max_length=100, blank=True)  # e.g. "6/1, 10 hours"
    housing_provided = models.BooleanField(default=False)
    meals_provided = models.BooleanField(default=False)
    helps_with_documents = models.BooleanField(default=False)  # employer helps to get the patent / registration
    is_active = models.BooleanField(default=True)
    # Paid ads: shown above the others until promoted_until.
    promoted_until = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(default=default_job_expiry)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["city", "industry"])]

    def __str__(self):
        return f"{self.title} — {self.employer}"


class EmployerReview(models.Model):
    """A worker's review of an employer. salary_not_paid marks complaints that feed the blacklist."""

    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name="reviews")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employer_reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    text = models.TextField(blank=True)
    salary_not_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["employer", "author"], name="one_review_per_employer")]

    def __str__(self):
        return f"{self.employer}: {self.rating}★ by {self.author}"


class Resume(models.Model):
    """A short resume a worker fills in about two minutes. Employers see it only while is_visible is on."""

    RUSSIAN_LEVELS = (("none", "Намедонам"), ("basic", "Каме"), ("good", "Хуб"), ("fluent", "Озод"))

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resume")
    full_name = models.CharField(max_length=150)
    birth_year = models.PositiveSmallIntegerField(
        blank=True, null=True, validators=[MinValueValidator(1940), MaxValueValidator(2012)],
    )
    city = models.CharField(max_length=100)
    industry = models.CharField(max_length=20, choices=INDUSTRIES)
    profession = models.CharField(max_length=150)  # e.g. "welder", "courier"
    experience_years = models.PositiveSmallIntegerField(default=0)
    russian_level = models.CharField(max_length=10, choices=RUSSIAN_LEVELS, default="basic")
    has_patent = models.BooleanField(default=False)
    about = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.full_name} — {self.profession}"


class JobApplication(models.Model):
    STATUSES = (("sent", "Sent"), ("viewed", "Viewed"), ("invited", "Invited"), ("rejected", "Rejected"))

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_applications")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUSES, default="sent")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["job", "applicant"], name="one_application_per_job")]

    def __str__(self):
        return f"{self.applicant} → {self.job}"
