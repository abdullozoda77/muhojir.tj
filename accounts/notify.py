"""One place that tells a user something: a notification in the app, plus an email when they allow it."""
import logging

from .emails import queue_email
from .models import Notification

logger = logging.getLogger(__name__)


def notify(user, title, message, kind="system"):
    Notification.objects.create(user=user, kind=kind, title=title, message=message)
    if user.email_reminders and user.email:
        try:
            queue_email(f"Muhojir — {title}", message, user.email)
        except OSError:
            # The notification in the app is already saved; a mail server problem must not stop the others.
            logger.exception("Email to %s failed", user.email)
