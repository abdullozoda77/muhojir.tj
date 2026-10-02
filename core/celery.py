"""Celery: background tasks (emails) and the daily schedule (Celery Beat). Tasks live in each app's tasks.py.
Server: `celery -A core worker` and `celery -A core beat` (deploy/muhojir-celery*.service)."""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("muhojir")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
