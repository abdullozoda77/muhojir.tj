"""Every new notification (reminders, job alerts, ones an admin adds) goes live to the user's open tabs,
once the database has really saved it."""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .live import push_new
from .models import Notification


@receiver(post_save, sender=Notification)
def notification_saved(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: push_new(instance))
