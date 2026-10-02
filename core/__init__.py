# Celery is loaded with Django, so `.delay()` works everywhere (see core/celery.py).
from .celery import app as celery_app

__all__ = ("celery_app",)
