"""Live notifications: every logged-in browser tab keeps a WebSocket open and joins its user's group.
A new Notification is sent to that group at once (see live.py), so the bell updates without a reload."""
from channels.generic.websocket import AsyncJsonWebsocketConsumer

NOT_LOGGED_IN = 4401  # close code the page understands as "get a fresh token and connect again"


def group_name(user_id):
    return f"user-{user_id}"


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=NOT_LOGGED_IN)
            return
        self.group = group_name(user.pk)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "group"):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":  # keeps the connection alive through proxies
            await self.send_json({"type": "pong"})

    # Called by group_send({"type": "notification.new", ...}) from live.py.
    async def notification_new(self, event):
        await self.send_json({"type": "notification", "notification": event["notification"], "unread": event["unread"]})

    async def notification_count(self, event):
        await self.send_json({"type": "unread", "unread": event["unread"]})
