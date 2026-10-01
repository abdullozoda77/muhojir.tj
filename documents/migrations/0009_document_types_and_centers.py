"""The five document types a migrant needs, created on a fresh database (before, they were only added by hand,
so a new server had no guides and no "add document" choices). Then the guides of 0006 are filled in for them,
the news of 0008 get their document links, and the demo migration center is replaced by the real Moscow one."""
import importlib

from django.db import migrations

TYPES = [
    # slug, title, how many days a new one usually lasts (None = it varies), order
    ("patent", "Патенти меҳнатӣ", None, 0),
    ("registration", "Бақайдгирӣ (регистрация)", 90, 1),
    ("migration-card", "Корти муҳоҷиратӣ", None, 2),
    ("insurance-dms", "Суғуртаи тиббӣ (ДМС)", 365, 3),
    ("medical", "Ташхиси тиббӣ", None, 4),
]

NEWS_TYPES = {
    "Нархи патент дар соли 2026": ["patent"],
    "Реестри шахсони назоратшаванда": ["patent", "registration"],
    "Бақайдгириро акнун тавассути Госуслуги": ["registration"],
    "Имтиҳони забони русӣ барои патент": ["patent"],
}

# Checked: the official Moscow center where patents are issued (Sakharovo), open every day.
CENTERS = [
    {
        "region": "Москва",
        "name": "ММЦ «Сахарово» — Многофункциональный миграционный центр Москвы",
        "address": "г. Москва, поселение Вороновское, Варшавское шоссе, 64-й км, домовладение 1, строение 47",
        "working_hours": "Ҳар рӯз 08:00–20:00",
        "website": "https://mc.mos.ru/",
    },
]


def add_types(apps, schema_editor):
    DocumentType = apps.get_model("documents", "DocumentType")
    for slug, title, days, order in TYPES:
        DocumentType.objects.get_or_create(slug=slug, defaults={"title": title, "default_validity_days": days, "order": order})

    # The guides (0006 skipped them when the types did not exist yet; it never touches a guide an admin wrote).
    importlib.import_module("documents.migrations.0006_fill_guides").fill(apps, schema_editor)

    LawNews = apps.get_model("documents", "LawNews")
    for start, slugs in NEWS_TYPES.items():
        for news in LawNews.objects.filter(title__startswith=start):
            if not news.document_types.exists():
                news.document_types.set(DocumentType.objects.filter(slug__in=slugs))

    MigrationCenter = apps.get_model("documents", "MigrationCenter")
    Region = apps.get_model("documents", "Region")
    MigrationCenter.objects.filter(name__startswith="[DEMO]").delete()
    for center in CENTERS:
        data = dict(center, region=Region.objects.filter(name=center["region"]).first())
        MigrationCenter.objects.get_or_create(name=data.pop("name"), defaults=data)


class Migration(migrations.Migration):
    dependencies = [("documents", "0008_real_law_news")]

    operations = [migrations.RunPython(add_types, migrations.RunPython.noop)]
