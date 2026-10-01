from django.core.management.base import BaseCommand
from django.utils import timezone

from jobs.alerts import jobs_since, notify_alerts
from jobs.trudvsem import DEFAULT_REGIONS, REGIONS, import_jobs


class Command(BaseCommand):
    help = "Imports real job ads from «Работа России» (trudvsem.ru, open data). Run it once a day (cron)."

    def add_arguments(self, parser):
        parser.add_argument("--regions", nargs="*", default=DEFAULT_REGIONS, help=f"Region codes; known: {', '.join(REGIONS)}")
        parser.add_argument("--limit", type=int, default=20, help="Ads per search word and region (max 100)")

    def handle(self, *args, regions, limit, **options):
        started = timezone.now()
        counts = import_jobs(regions=regions, limit=min(limit, 100), log=self.stdout.write)
        told = notify_alerts(jobs_since(started))
        self.stdout.write(self.style.SUCCESS(
            f"New: {counts['created']}, refreshed: {counts['updated']}, skipped: {counts['skipped']}, "
            f"failed requests: {counts['failed']}, users told about new jobs: {told}"
        ))
