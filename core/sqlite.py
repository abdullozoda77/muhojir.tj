"""SQLite's LIKE ignores case only for Latin letters, so ?search=москва would not find "Москва".
This replaces SQLite's like() with a Python version that ignores case for every alphabet (Cyrillic, Tajik...).
PostgreSQL does not need it; there it is never switched on."""
import re

from django.db.backends.signals import connection_created


def unicode_like(pattern, value, escape=None):
    """SQL "value LIKE pattern ESCAPE escape": % is any text, _ is one letter, case is ignored."""
    if pattern is None or value is None:
        return None
    regex = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if escape and ch == escape and i + 1 < len(pattern):
            regex.append(re.escape(pattern[i + 1]))
            i += 2
            continue
        regex.append(".*" if ch == "%" else "." if ch == "_" else re.escape(ch))
        i += 1
    return re.fullmatch("".join(regex), str(value), re.IGNORECASE | re.DOTALL) is not None


def use_unicode_like(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        connection.connection.create_function("like", 2, unicode_like)
        connection.connection.create_function("like", 3, unicode_like)


connection_created.connect(use_unicode_like)
