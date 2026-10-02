from celery import shared_task
from django.core.management import call_command


@shared_task
def send_reminders():
    """Every morning (CELERY_BEAT_SCHEDULE): reminders about documents that end soon."""
    call_command("send_reminders")
