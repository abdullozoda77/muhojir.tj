from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from accounts.telegram import call, handle_update


class Command(BaseCommand):
    help = "Listens to the Telegram bot (long polling) so users can link their chat with /start. Keep it running."

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError("Put TELEGRAM_BOT_TOKEN in .env first.")
        self.stdout.write("Telegram bot is listening. Ctrl+C to stop.")
        offset = 0
        while True:
            try:
                # Waits up to 30 seconds for new messages, so it does not load the server.
                result = call("getUpdates", {"offset": offset, "timeout": 30}, timeout=40)
            except OSError as error:
                self.stderr.write(f"Telegram is not reachable: {error}")
                continue
            for update in result.get("result", []):
                offset = update["update_id"] + 1
                handle_update(update)
