"""Sends notification events to a user's open browser tabs. A problem here (no channel layer, Redis down)
must never break saving the notification itself, so errors are only logged."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import group_name

logger = logging.getLogger(__name__)


def _send(user_id, event):
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group_name(user_id), event)
    except Exception:
        logger.exception("Live notification to user %s failed", user_id)


def unread_count(user_id):
    from .models import Notification

    return Notification.objects.filter(user_id=user_id, is_read=False).count()


def push_new(notification):
    from .serializers import NotificationSerializer

    _send(notification.user_id, {
        "type": "notification.new",
        "notification": NotificationSerializer(notification).data,
        "unread": unread_count(notification.user_id),
    })


def push_count(user_id):
    """After notifications were read or deleted: every open tab updates its bell."""
    _send(user_id, {"type": "notification.count", "unread": unread_count(user_id)})
