from datetime import date, timedelta

from django.db import IntegrityError

from accounts.notify import notify
from .models import ReminderLog, UserDocument


def reminder_text(document, days):
    title = document.document_type.title
    end = document.expires_at.strftime("%d.%m.%Y")
    if days == 1:
        return f"Мӯҳлати «{title}» пагоҳ ({end}) тамом мешавад. Онро сари вақт нав кунед."
    return f"Мӯҳлати «{title}» пас аз {days} рӯз ({end}) тамом мешавад. Онро сари вақт нав кунед."


def send_due_reminders(today=None):
    """Sends today's reminders: on the day the owner chose (remind_days_before) and the day before the end.
    Safe to run many times a day: ReminderLog remembers what was already sent. Returns how many were sent."""
    today = today or date.today()
    sent = 0
    for document in UserDocument.objects.filter(expires_at__gt=today, user__is_active=True).select_related("user", "document_type"):
        days_left = (document.expires_at - today).days
        if days_left not in (document.remind_days_before, 1):
            continue
        try:
            ReminderLog.objects.create(user_document=document, expires_at=document.expires_at, days_before=days_left)
        except IntegrityError:
            continue  # already sent today
        notify(document.user, document.document_type.title, reminder_text(document, days_left), kind="reminder")
        sent += 1
    return sent
