"""Phone notifications (Web Push): the browser gives us an address and keys, we send it an encrypted message,
and the phone shows it even when the site is closed."""
import json
import logging

from django.conf import settings

from .models import PushSubscription

logger = logging.getLogger(__name__)


def push_enabled():
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def send_push(user, title, message, url="/notifications"):
    """Sends to every phone/browser of the user. Returns how many got it. Dead subscriptions are removed."""
    if not push_enabled():
        return 0
    from pywebpush import WebPushException, webpush  # imported here: only needed when push is set up

    sent = 0
    payload = json.dumps({"title": title, "body": message, "url": url})
    for sub in PushSubscription.objects.filter(user=user):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CONTACT},
                ttl=24 * 60 * 60,
            )
            sent += 1
        except WebPushException as error:
            status = getattr(error.response, "status_code", None)
            if status in (404, 410):  # the browser unsubscribed or the app was removed
                sub.delete()
            else:
                logger.warning("Push to %s failed: %s", user, error)
        except Exception:  # a network problem must not stop the other notifications
            logger.exception("Push to %s failed", user)
    return sent
