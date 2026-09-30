"""Telegram reminders through the Bot API (free), with plain urllib, no extra packages.
Linking: the site gives a link t.me/<bot>?start=<code>; the user presses Start; the bot sees "/start <code>"
and saves the user's chat id. After that notify() also sends every message there."""
import json
import logging
import urllib.request

from django.conf import settings

from .models import User

logger = logging.getLogger(__name__)


def call(method, data, timeout=10):
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"
    request = urllib.request.Request(url, data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read())


def send_telegram(chat_id, text):
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        call("sendMessage", {"chat_id": chat_id, "text": text})
        return True
    except OSError:
        logger.exception("Telegram message to %s failed", chat_id)
        return False


def handle_update(update):
    """One incoming message: "/start <code>" links a user, "/stop" unlinks."""
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    chat_id = str((message.get("chat") or {}).get("id", ""))
    if not chat_id:
        return
    if text.startswith("/start "):
        code = text.split(" ", 1)[1].strip()
        user = User.objects.filter(telegram_link_code=code).first() if code else None
        if user is None:
            send_telegram(chat_id, "Пайванд кӯҳна шудааст. Дар сайти Muhojir.tj аз нав «Telegram-ро пайваст кардан»-ро пахш кунед.")
            return
        user.telegram_chat_id = chat_id
        user.telegram_link_code = ""
        user.save(update_fields=["telegram_chat_id", "telegram_link_code"])
        send_telegram(chat_id, "✅ Пайваст шуд! Ёдраскуниҳо дар бораи мӯҳлати ҳуҷҷатҳо акнун ба ин ҷо меоянд.")
    elif text == "/stop":
        User.objects.filter(telegram_chat_id=chat_id).update(telegram_chat_id="")
        send_telegram(chat_id, "Ёдраскуниҳо дар Telegram хомӯш шуданд.")
    else:
        send_telegram(chat_id, "Салом! Ин боти Muhojir.tj аст. Барои пайваст кардан ба сайт дароед: Профил → Telegram.")
