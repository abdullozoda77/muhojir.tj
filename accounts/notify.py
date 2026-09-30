"""One place that tells a user something: a notification in the app, an email when they allow it,
and a Telegram message when they linked Telegram."""
import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification
from .telegram import send_telegram

logger = logging.getLogger(__name__)


def notify(user, title, message, kind="system"):
    Notification.objects.create(user=user, kind=kind, title=title, message=message)
    if user.email_reminders and user.email:
        try:
            send_mail(f"Muhojir.tj — {title}", message, settings.DEFAULT_FROM_EMAIL, [user.email])
        except OSError:
            # The notification in the app is already saved; a mail server problem must not stop the others.
            logger.exception("Email to %s failed", user.email)
    if user.telegram_chat_id:
        send_telegram(user.telegram_chat_id, f"{title}\n\n{message}")
