"""Codes by email (SMTP, see MAILERS in settings): confirming the email after sign-up and resetting the password."""
import secrets
from email.utils import make_msgid

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import EmailMessage
from django.utils import timezone

from .models import EmailCode

SUBJECTS = {"verify": "Тасдиқи почта", "reset": "Барқарор кардани парол"}
LINES = {"verify": "Рамзи тасдиқи почтаи шумо дар Muhojir", "reset": "Рамзи барқарор кардани парол дар Muhojir"}


def send_plain(subject, body, to):
    """Sends a plain-text email through the SMTP server from settings. It is kept like an ordinary personal email,
    because Gmail hides automatic-looking ones: plain text, and a Message-ID with the sender's own domain
    (by default Django puts the computer's name there, which spam filters dislike)."""
    sender = settings.DEFAULT_FROM_EMAIL
    domain = sender.rsplit("@", 1)[-1].strip(">").strip() or "localhost"
    EmailMessage(subject=subject, body=body, from_email=sender, to=[to], headers={"Message-ID": make_msgid(domain=domain)}).send()


def send_code(email, purpose="verify"):
    """Makes a new code, saves its hash (replacing any older code for this email) and emails the code."""
    code = f"{secrets.randbelow(10**6):06d}"
    EmailCode.objects.update_or_create(
        email=email,
        defaults={"purpose": purpose, "code_hash": make_password(code), "sent_at": timezone.now(), "attempts": 0},
    )
    if settings.DEBUG:
        # Development only: the code is also shown in the server log, so you can test while email is slow or lost.
        print(f"\n*** {purpose} code for {email}: {code} ***\n", flush=True)
    minutes = int(settings.LOGIN_CODE_LIFETIME.total_seconds() // 60)
    send_plain(
        f"Muhojir — {SUBJECTS[purpose]}",
        f"Салом!\n\n{LINES[purpose]}: {code}\n\nРамз {minutes} дақиқа амал мекунад.\n"
        "Агар шумо ин корро накарда бошед, ин мактубро нодида гиред.\n\nMuhojir",
        email,
    )
