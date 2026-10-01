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


# Where a job ad comes from. All jobs are imported from «Работа России» (trudvsem.ru, the state job portal
# whose ads are open data); people apply on the source site (Job.external_url).
SOURCES = (("trudvsem", "Работа России"),)


def default_job_expiry():
    return timezone.now() + timedelta(days=30)


class Employer(models.Model):
    """The company of imported job ads, found again by its code on the source site (external_id).
    Admins verify real companies and put the ones that don't pay wages on the blacklist."""

    source = models.CharField(max_length=20, choices=SOURCES, default="trudvsem")
    external_id = models.CharField(max_length=40, blank=True, null=True, unique=True)
    website = models.URLField(blank=True)
    name = models.CharField(max_length=200)
    inn = models.CharField("INN", max_length=12, blank=True)  # Russian tax number, checked by admins when verifying
    city = models.CharField(max_length=100)
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
    expires_at = models.DateTimeField(default=default_job_expiry)
    # Where the ad came from, its id there, and the page where people apply.
    source = models.CharField(max_length=20, choices=SOURCES, default="trudvsem")
    external_id = models.CharField(max_length=60, blank=True, null=True, unique=True)
    external_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["city", "industry"]), models.Index(fields=["source"])]

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


class SavedJob(models.Model):
    """A job the user saved to look at later."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_jobs")
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="saved_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "job"], name="one_save_per_job")]

    def __str__(self):
        return f"{self.user} ♥ {self.job}"


class JobAlert(models.Model):
    """"Tell me about new jobs like these": the filters of the jobs page, kept. After each import the user gets
    one notification with the new jobs that match (see jobs/alerts.py). Empty fields mean "any"."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_alerts")
    search = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=20, choices=INDUSTRIES, blank=True)
    min_salary = models.PositiveIntegerField(blank=True, null=True)
    housing_provided = models.BooleanField(default=False)  # only jobs with housing
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user}: {self.search or self.get_industry_display() or '—'} {self.city}"

    def filters(self):
        """The alert as query parameters of the jobs list (?search=...&city=...)."""
        data = {"search": self.search, "city": self.city, "industry": self.industry,
                "min_salary": self.min_salary, "housing_provided": "true" if self.housing_provided else ""}
        return {key: value for key, value in data.items() if value}
