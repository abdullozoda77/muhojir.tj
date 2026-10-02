"""Login codes by email (SMTP, see MAILERS in settings). Email is free, unlike SMS."""
import secrets

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailCode


def send_login_code(email):
    """Makes a new code, saves its hash (replacing any older code for this email) and emails the code."""
    code = f"{secrets.randbelow(10**6):06d}"
    EmailCode.objects.update_or_create(
        email=email, defaults={"code_hash": make_password(code), "sent_at": timezone.now(), "attempts": 0}
    )
    if settings.DEBUG:
        # Development only: the code is also shown in the server log, so you can log in while email is slow or lost.
        print(f"\n*** Login code for {email}: {code} ***\n", flush=True)
    minutes = int(settings.LOGIN_CODE_LIFETIME.total_seconds() // 60)
    send_mail(
        subject=f"Muhojir — рамзи воридшавӣ {code}",
        message=(
            f"Салом!\n\n"
            f"Рамзи воридшавӣ ба Muhojir: {code}\n\n"
            f"Рамз {minutes} дақиқа амал мекунад.\n"
            "Агар шумо ворид шудан нахостед, ин мактубро нодида гиред."
        ),
        html_message=(
            f'<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">'
            f'<h2 style="color:#0369a1;margin:0 0 12px">Muhojir</h2>'
            f"<p>Салом!</p>"
            f"<p>Рамзи воридшавӣ:</p>"
            f'<p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f0f9ff;border-radius:12px;'
            f'padding:16px;text-align:center;margin:16px 0">{code}</p>'
            f"<p>Рамз {minutes} дақиқа амал мекунад.</p>"
            f'<p style="color:#64748b;font-size:13px">Агар шумо ворид шудан нахостед, ин мактубро нодида гиред.</p>'
            f"</div>"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
    )
