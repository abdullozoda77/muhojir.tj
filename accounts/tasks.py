from celery import shared_task

from .emails import send_plain


# A mail server that is down for a moment is tried again: after 30 s, 60 s, 120 s, then the email is dropped.
@shared_task(autoretry_for=(OSError,), retry_backoff=30, max_retries=3)
def send_email(subject, body, to):
    send_plain(subject, body, to)
