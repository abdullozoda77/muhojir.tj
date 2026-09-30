from django.core.management.base import BaseCommand

from documents.reminders import send_due_reminders


class Command(BaseCommand):
    help = "Sends reminders about documents that end soon. Run it once a day (cron), e.g. at 9:00."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"Reminders sent: {send_due_reminders()}"))
