"""Real job ads from «Работа России» (trudvsem.ru), the state job portal. Its ads are open data with a free API
(no key): https://opendata.trudvsem.ru/api/v1/vacancies/region/<code>?text=...&offset=<page>&limit=<n>

We import the jobs migrants usually look for, in the regions where most of them work. Ads of recruitment
agencies are skipped (a common way to cheat migrants), and contact persons' names and phones are not copied:
people apply on the source page (external_url)."""
import html
import json
import logging
import re
import time
import urllib.parse
import urllib.request
from datetime import timedelta

from django.utils import timezone

from .models import Employer, Job

logger = logging.getLogger(__name__)

API = "https://opendata.trudvsem.ru/api/v1/vacancies/region/{region}?{query}"

# Region codes of the portal. The first three are imported by default.
REGIONS = {
    "7700000000000": "Москва",
    "5000000000000": "Московская область",
    "7800000000000": "Санкт-Петербург",
    "6600000000000": "Свердловская область",
    "5400000000000": "Новосибирская область",
    "2300000000000": "Краснодарский край",
    "1600000000000": "Республика Татарстан",
}
DEFAULT_REGIONS = ["7700000000000", "5000000000000", "7800000000000"]

# What we search for, by our industry.
SEARCHES = {
    "construction": ["разнорабочий", "строитель", "сварщик", "монтажник", "отделочник"],
    "warehouse": ["грузчик", "кладовщик", "комплектовщик"],
    "delivery": ["курьер"],
    "taxi": ["водитель"],
    "food": ["повар", "кухонный работник"],
    "cleaning": ["уборщик", "дворник"],
    "manufacturing": ["оператор производственной линии", "швея"],
    "trade": ["продавец"],
}

# An imported ad stays open this long after it was last seen; run the import daily so live ads stay open.
KEEP_DAYS = 3


def fetch(region, text, limit):
    query = urllib.parse.urlencode({"text": text, "offset": 0, "limit": limit})
    request = urllib.request.Request(API.format(region=region, query=query), headers={"User-Agent": "Muhojir job import"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read())
    return [item["vacancy"] for item in (data.get("results") or {}).get("vacancies", [])]


def clean(text):
    """HTML tags and entities out, spaces tidied."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    return re.sub(r"[ \t]+", " ", text).strip()


def city_of(region_name):
    # "Город Москва" -> "Москва"; other region names stay as they are.
    return re.sub(r"^Город\s+", "", region_name or "").strip()


def money(value):
    return value if isinstance(value, int) and value > 0 else None


def has(text, *words):
    return any(word in text for word in words)


def save(vacancy, industry):
    """Creates or refreshes one ad. Returns "created", "updated" or "skipped"."""
    company = vacancy.get("company") or {}
    title = clean(vacancy.get("job-name"))
    if not title or not vacancy.get("id") or company.get("hr-agency"):
        return "skipped"

    city = city_of((vacancy.get("region") or {}).get("name"))
    employer, _ = Employer.objects.update_or_create(
        external_id=company.get("companycode") or company.get("ogrn") or company.get("inn"),
        defaults={
            "name": clean(company.get("name"))[:200] or "—",
            "inn": (company.get("inn") or "")[:12],
            "city": city[:100],
            "website": company.get("url") or "",
            "source": "trudvsem",
        },
    )

    duty = clean(vacancy.get("duty"))
    requirements = clean(vacancy.get("requirements"))
    description = duty + (f"\n\nТребования: {requirements}" if requirements and requirements != "-" else "")
    text = (description + " " + title).lower()
    addresses = (vacancy.get("addresses") or {}).get("address") or []
    salary_from, salary_to = money(vacancy.get("salary_min")), money(vacancy.get("salary_max"))
    if salary_from and salary_to and salary_to < salary_from:
        salary_to = None

    fields = {
        "employer": employer,
        "title": title[:200],
        "description": description[:6000] or title,
        "city": city[:100],
        "address": (addresses[0].get("location") or "")[:255] if addresses else "",
        "salary_from": salary_from,
        "salary_to": salary_to,
        "salary_period": "month",
        "schedule": clean(vacancy.get("schedule"))[:100],
        "housing_provided": has(text, "общежит", "проживани", "жильё", "жилье"),
        "meals_provided": has(text, "питани"),
        "helps_with_documents": bool((vacancy.get("workPlaceType") or {}).get("workPlaceForeign")) or has(text, "патент"),
        "external_url": (vacancy.get("vac_url") or "")[:500],
        "source": "trudvsem",
        "expires_at": timezone.now() + timedelta(days=KEEP_DAYS),
    }
    job = Job.objects.filter(external_id=vacancy["id"]).first()
    if job is None:
        # Some companies post the same job many times (one per address); one copy is enough for the list.
        same = Job.objects.filter(employer=employer, title=fields["title"], city=fields["city"], salary_from=salary_from, salary_to=salary_to)
        if same.exists():
            same.update(expires_at=fields["expires_at"])  # still advertised, so keep the copy we have open
            return "skipped"
        Job.objects.create(external_id=vacancy["id"], industry=industry, is_active=True, **fields)
        return "created"
    # An ad an admin switched off stays off; its industry stays the one it was first found under.
    for key, value in fields.items():
        setattr(job, key, value)
    job.save()
    return "updated"


def import_jobs(regions=None, limit=20, pause=0.3, log=print):
    """Imports ads for every search in every region. Returns counts {"created", "updated", "skipped", "failed"}."""
    counts = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}
    for region in regions or DEFAULT_REGIONS:
        for industry, words in SEARCHES.items():
            for word in words:
                try:
                    vacancies = fetch(region, word, limit)
                except (OSError, ValueError) as error:
                    counts["failed"] += 1
                    log(f"  {REGIONS.get(region, region)} / {word}: {error}")
                    continue
                for vacancy in vacancies:
                    counts[save(vacancy, industry)] += 1
                time.sleep(pause)  # be polite to the portal
        log(f"{REGIONS.get(region, region)}: done")
    return counts
