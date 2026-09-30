"""Private files: document photos and payment receipts. They are kept in PRIVATE_MEDIA_ROOT, which the web server
never serves; the API hands a file only to its owner. Names are random, so the original file name does not leak."""
import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.core.validators import FileExtensionValidator

MAX_FILE_MB = 10


def private_storage():
    return FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT)


def random_name(folder, filename):
    return f"{folder}/{uuid.uuid4().hex}{os.path.splitext(filename)[1].lower()}"


def document_photo_path(instance, filename):
    return random_name("documents", filename)


def receipt_path(instance, filename):
    return random_name("receipts", filename)


def validate_file_size(file):
    if file.size > MAX_FILE_MB * 1024 * 1024:
        raise ValidationError(f"The file is too big. The limit is {MAX_FILE_MB} MB.")


file_validators = [FileExtensionValidator(["jpg", "jpeg", "png", "webp", "pdf"]), validate_file_size]
