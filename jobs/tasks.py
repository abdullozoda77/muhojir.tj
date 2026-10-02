from celery import shared_task
from django.core.management import call_command


@shared_task
def import_jobs():
    """Every morning (CELERY_BEAT_SCHEDULE): new vacancies from «Работа России» and alerts about them."""
    call_command("import_jobs")
