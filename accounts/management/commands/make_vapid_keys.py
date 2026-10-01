"""Makes the key pair for phone notifications and prints it as .env lines:
    python manage.py make_vapid_keys >> .env
Make them once per server; new keys mean every phone has to turn notifications on again."""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from django.core.management.base import BaseCommand


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class Command(BaseCommand):
    help = "Print a new VAPID key pair for phone notifications (append it to .env)."

    def handle(self, *args, **options):
        key = ec.generate_private_key(ec.SECP256R1())
        private = key.private_numbers().private_value.to_bytes(32, "big")
        public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        self.stdout.write(f"VAPID_PUBLIC_KEY={b64(public)}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={b64(private)}")
