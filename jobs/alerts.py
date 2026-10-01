"""After an import: one notification per alert with the new jobs that match it."""
from accounts.notify import notify
from .filters import JobFilter
from .models import Job, JobAlert


def notify_alerts(new_jobs):
    """new_jobs: a queryset of the jobs that just appeared. Returns how many users were told."""
    if not new_jobs.exists():
        return 0
    told = 0
    for alert in JobAlert.objects.filter(is_active=True, user__is_active=True).select_related("user"):
        params = alert.filters()
        matching = JobFilter(data=params, queryset=new_jobs.filter(employer__is_blacklisted=False)).qs
        count = matching.count()
        if not count:
            continue
        titles = ", ".join(matching.values_list("title", flat=True)[:3])
        notify(
            alert.user,
            "Ҷойи кори нав",
            f"{count} ҷойи нави кор аз рӯи ҷустуҷӯи шумо: {titles}{'…' if count > 3 else ''}",
            kind="job",
        )
        told += 1
    return told


def jobs_since(moment):
    return Job.objects.filter(created_at__gte=moment, is_active=True)
