from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        # Makes ?search= ignore upper/lower case for Cyrillic on SQLite too (see core/sqlite.py).
        from core import sqlite  # noqa: F401
