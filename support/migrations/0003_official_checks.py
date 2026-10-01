"""Official pages where a migrant checks their own papers: is the patent valid, is there an entry ban,
are there debts that stop them leaving Russia. Each description holds the steps, one per line.
The MVD pages open only from Russian internet, so the steps also say what to choose there."""
from django.db import migrations

MVD_SERVICES = "https://xn--b1afk4ade4e.xn--b1ab2a0a.xn--b1aew.xn--p1ai/"

CHECKS = [
    (1, "Патент эътибор дорад ё не",
     MVD_SERVICES + "info-service.htm?sid=2060",
     "Сайти хизматҳои МВД-ро кушоед (сервисы.гувм.мвд.рф).\n"
     "«Проверка действительности разрешений на работу и патентов»-ро интихоб кунед.\n"
     "Серия ва рақами патент ва санаи доданро нависед — ё серия ва рақами шиноснома ва шаҳрвандиро.\n"
     "Рамзи тасвириро (капча) нависед ва «Отправить»-ро пахш кунед.\n"
     "Агар «действителен» набошад, зуд ба маркази муҳоҷират равед."),
    (2, "Манъи даромадан ба Русия",
     MVD_SERVICES,
     "Сайти хизматҳои МВД-ро кушоед (сервисы.гувм.мвд.рф).\n"
     "«Проверка наличия оснований для запрета въезда»-ро интихоб кунед.\n"
     "Ному насаб (мисли шиноснома), санаи таваллуд, шаҳрвандӣ ва рақами шиносномаро нависед.\n"
     "Ҷавоби сайт маълумотӣ аст: ҳамаи манъҳо (масалан, аз ФСБ) дар он намоён нестанд.\n"
     "Пеш аз сафар ба Русия ин санҷишро ҳатман кунед."),
    (3, "Қарзҳо ва ҷаримаҳои пардохтнашуда (ФССП)",
     "https://fssp.gov.ru/iss/ip",
     "Сайти Хадамоти иҷроияи судии Русия (ФССП)-ро кушоед.\n"
     "Минтақаро интихоб кунед ва ному насаб ва санаи таваллудро нависед.\n"
     "Агар қарз бошад (ҷарима, андоз, алимент), онро пардохт кунед.\n"
     "Бо қарзи калон метавонанд баромадан аз Русияро манъ кунанд ва дар бозгашт мушкил пеш ояд."),
]


def add_checks(apps, schema_editor):
    HelpContact = apps.get_model("support", "HelpContact")
    HelpContact.objects.filter(title__startswith="[DEMO]").delete()
    for order, title, website, steps in CHECKS:
        HelpContact.objects.get_or_create(website=website, kind="mvd_check", defaults={"title": title, "order": order, "description": steps})


class Migration(migrations.Migration):
    dependencies = [("support", "0002_info_sites")]

    operations = [migrations.RunPython(add_checks, migrations.RunPython.noop)]
