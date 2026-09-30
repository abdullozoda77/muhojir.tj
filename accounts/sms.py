import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(phone, text):
    """Sends one SMS. Only the console backend exists for now: the text goes to the Django log.
    Connect a provider (e.g. SMS.ru or Twilio) here when SMS_BACKEND is set to something else."""
    if settings.SMS_BACKEND == "console":
        logger.warning("SMS to %s: %s", phone, text)
        print(f"SMS to {phone}: {text}")
        return
    raise NotImplementedError(f"SMS backend {settings.SMS_BACKEND!r} is not connected yet.")
