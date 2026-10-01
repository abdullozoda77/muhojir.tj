"""The numbers on the admin start page: users, documents and deadlines, payments, jobs and complaints,
each with a link to the matching list in the admin."""
from datetime import date, timedelta

from django.contrib import admin
from django.db.models import Count, Max, Sum
from django.utils import timezone

from accounts.models import PushSubscription, User
from documents.models import ExamQuestion, LawNews, Payment, ReminderLog, UserDocument
from jobs.models import Employer, EmployerReview, Job, JobAlert, SavedJob


def stats():
    now, today = timezone.now(), date.today()
    week_ago, month_start = now - timedelta(days=7), today.replace(day=1)
    open_jobs = Job.objects.filter(is_active=True, expires_at__gt=now, employer__is_blacklisted=False)
    payments = Payment.objects.filter(paid_at__gte=month_start)
    last_import = Job.objects.aggregate(last=Max("updated_at"))["last"]

    return {
        "cards": [
            {"title": "Корбарон", "value": User.objects.filter(is_active=True).count(),
             "note": f"+{User.objects.filter(date_joined__gte=week_ago).count()} дар 7 рӯз", "url": "accounts/user/"},
            {"title": "Ҳуҷҷатҳо", "value": UserDocument.objects.count(),
             "note": f"{UserDocument.objects.filter(expires_at__lt=today).count()} мӯҳлаташ гузашта", "url": "documents/userdocument/"},
            {"title": "Тамом мешаванд (30 рӯз)",
             "value": UserDocument.objects.filter(expires_at__gte=today, expires_at__lte=today + timedelta(days=30)).count(),
             "note": f"{ReminderLog.objects.filter(sent_at__gte=week_ago).count()} ёдраскунӣ дар 7 рӯз", "url": "documents/userdocument/", "warn": True},
            {"title": "Пардохтҳо (ин моҳ)", "value": payments.count(),
             "note": f"{int(payments.aggregate(s=Sum('amount'))['s'] or 0):,} ₽".replace(",", " "), "url": "documents/payment/"},
            {"title": "Ҷойҳои кори фаъол", "value": open_jobs.count(),
             "note": f"+{Job.objects.filter(created_at__gte=now - timedelta(days=1)).count()} дар 24 соат", "url": "jobs/job/"},
            {"title": "Шикоят аз маош (30 рӯз)",
             "value": EmployerReview.objects.filter(salary_not_paid=True, created_at__gte=now - timedelta(days=30)).count(),
             "note": f"{Employer.objects.filter(is_blacklisted=True).count()} ширкат дар рӯйхати сиёҳ",
             "url": "jobs/employerreview/?salary_not_paid__exact=1", "warn": True},
        ],
        "last_import": last_import,
        "import_late": not last_import or now - last_import > timedelta(hours=36),
        "small": [
            ("Огоҳиҳо дар телефон", PushSubscription.objects.values("user").distinct().count(), "accounts/pushsubscription/"),
            ("Ёдраскунӣ ба почта фаъол", User.objects.filter(is_active=True, email_reminders=True).count(), "accounts/user/"),
            ("Огоҳиҳои кори нав", JobAlert.objects.filter(is_active=True).count(), "jobs/jobalert/"),
            ("Ҷойҳои захирашуда", SavedJob.objects.count(), "jobs/savedjob/"),
            ("Хабарҳои нашршуда", LawNews.objects.filter(is_published=True).count(), "documents/lawnews/"),
            ("Саволҳои имтиҳон", ExamQuestion.objects.filter(is_active=True).count(), "documents/examquestion/"),
        ],
        "documents_by_type": UserDocument.objects.values("document_type__title").annotate(n=Count("id")).order_by("-n"),
        "jobs_by_city": open_jobs.values("city").annotate(n=Count("id")).order_by("-n")[:6],
        "complaints": EmployerReview.objects.filter(salary_not_paid=True).select_related("employer").order_by("-created_at")[:5],
    }


def install(site=admin.site):
    """The admin start page shows the numbers above the usual list of models."""
    site.index_template = "admin/dashboard.html"
    show = site.index

    def index(request, extra_context=None):
        return show(request, {**(extra_context or {}), "stats": stats()})

    site.index = index
