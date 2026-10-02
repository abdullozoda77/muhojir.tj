#!/usr/bin/env bash
# Installs Muhojir on the server, or brings an installed copy up to date; safe to run again.
# Run as root after cloning the project to /home/romin/muhojir:
#   bash /home/romin/muhojir/deploy/setup.sh
#
# What runs where:
#   nginx :8040  →  React site (frontend/dist), /static (admin styles), /media
#                →  /api /admin /swagger /redoc and the WebSocket /ws/  →  gunicorn 127.0.0.1:8041
#   gunicorn runs Django as ASGI with Uvicorn workers, so the same process serves the API and live notifications;
#   the workers share the notifications through Redis (database 13).
#   A systemd timer runs the daily jobs at 06:00: new vacancies (import_jobs) and document reminders (send_reminders).
# Other projects on this server (Rohat on 8030/8031, other students' apps) are not touched.
set -euo pipefail

APP_USER=romin
APP=/home/$APP_USER/muhojir
PUBLIC_PORT=8040   # the address people open: http://<server>:8040
APP_PORT=8041      # gunicorn, reachable only from nginx
REDIS_DB=13        # Rohat uses 12
DOMAIN=""          # later, e.g. muhojir.khayrkhoh.tj (it must point to this server in DNS); empty = by port only
NODE_DIR=/home/$APP_USER/.local/node22
SERVER_IP=$(hostname -I | awk '{print $1}')

step() { echo; echo "==> $*"; }

# Sets one KEY=value line in .env (adds it if missing); other lines, keys and passwords stay as they are.
set_env() {
  python3 - "$APP/.env" "$1" "$2" <<'PY'
import sys
path, key, value = sys.argv[1:]
lines = open(path).read().splitlines()
for i, line in enumerate(lines):
    if line.startswith(key + "="):
        lines[i] = f"{key}={value}"
        break
else:
    lines.append(f"{key}={value}")
open(path, "w").write("\n".join(lines) + "\n")
PY
}
as_user() { sudo -u "$APP_USER" -H bash -c "cd '$APP' && $*"; }

[ "$(id -u)" = 0 ] || { echo "Run this script as root."; exit 1; }
[ -d "$APP/.git" ] || { echo "Clone the project to $APP first (see deploy/README.md)."; exit 1; }

# Both ports must be free, or already Muhojir's.
for port in $PUBLIC_PORT $APP_PORT; do
  if ss -ltn "sport = :$port" | grep -q LISTEN && [ ! -e /etc/nginx/sites-enabled/muhojir ]; then
    echo "Port $port is used by another program. Change PUBLIC_PORT / APP_PORT at the top of this script."
    exit 1
  fi
done

step "System packages (only what is missing)"
missing=""
command -v nginx >/dev/null || missing="$missing nginx"
command -v redis-server >/dev/null || missing="$missing redis-server"
python3 -c "import venv" 2>/dev/null || missing="$missing python3-venv"
if [ -n "$missing" ]; then
  apt-get update -qq && apt-get install -y -qq $missing
fi
systemctl enable -q --now redis-server

step "Python packages"
as_user "[ -d .venv ] || python3 -m venv .venv"
as_user ".venv/bin/pip install -q --upgrade pip"
as_user ".venv/bin/pip install -q -r requirements.txt"

step "Settings (.env)"
if [ ! -f "$APP/.env" ]; then
  secret=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
  cat > "$APP/.env" <<ENV
SECRET_KEY=$secret
DEBUG=False

# Emails with the sign-up and password codes. Gmail: the address and a 16-letter app password from
# https://myaccount.google.com/apppasswords. While these are empty, emails are not sent.
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
ENV
  echo "Created $APP/.env: add the email address and app password later (see the end of this script)."
fi
if [ -n "$DOMAIN" ]; then HOSTS="$DOMAIN,$SERVER_IP"; else HOSTS="$SERVER_IP"; fi
set_env DEBUG False
set_env REDIS_URL "redis://127.0.0.1:6379/$REDIS_DB"
set_env ALLOWED_HOSTS "$HOSTS,localhost,127.0.0.1"
ORIGINS="http://$SERVER_IP:$PUBLIC_PORT"
[ -n "$DOMAIN" ] && ORIGINS="https://$DOMAIN,http://$DOMAIN,$ORIGINS"
set_env CSRF_TRUSTED_ORIGINS "$ORIGINS"
set_env CORS_ALLOWED_ORIGINS "$ORIGINS"
chown "$APP_USER:$APP_USER" "$APP/.env"
chmod 600 "$APP/.env"  # keys and passwords: readable only by $APP_USER

step "Database and admin styles"
as_user ".venv/bin/python manage.py migrate --noinput"
as_user ".venv/bin/python manage.py collectstatic --noinput -v 0"
as_user "mkdir -p media private_media"

step "Node.js 22 for $APP_USER (shared with Rohat; the system Node.js stays as it is)"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  # The official build from nodejs.org, checked against its published SHA-256 sum.
  sudo -u "$APP_USER" -H env NODE_DIR="$NODE_DIR" bash -s <<'NODE'
set -euo pipefail
base=https://nodejs.org/dist/latest-v22.x
tmp=$(mktemp -d)
curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
file=$(grep -oE 'node-v22\.[0-9.]+-linux-x64\.tar\.xz' "$tmp/SHASUMS256.txt" | head -1)
curl -fsSL "$base/$file" -o "$tmp/$file"
(cd "$tmp" && grep " $file\$" SHASUMS256.txt | sha256sum -c -)
mkdir -p "$NODE_DIR"
tar -xJf "$tmp/$file" -C "$NODE_DIR" --strip-components=1
rm -rf "$tmp"
NODE
fi
as_user "'$NODE_DIR/bin/node' --version"

step "Frontend build"
as_user "cd frontend && export PATH='$NODE_DIR/bin':\$PATH && npm ci --no-audit --no-fund --loglevel=error && npm run build"

step "Access for nginx (it reads the site, styles and public files; .env, the database and private files stay closed)"
chmod o+x "/home/$APP_USER" "$APP" "$APP/frontend"
chmod -R o+rX "$APP/frontend/dist" "$APP/static" "$APP/media"
chmod 700 "$APP/private_media"

step "nginx"
install -m 644 "$APP/deploy/nginx-muhojir-site.conf" /etc/nginx/snippets/muhojir-site.conf
{
  echo "# Muhojir: generated by deploy/setup.sh, do not edit here (changes are lost on the next update)."
  echo "server {"
  echo "    listen $PUBLIC_PORT;"
  echo "    server_name _;"
  echo "    include snippets/muhojir-site.conf;"
  echo "}"
  if [ -n "$DOMAIN" ]; then
    echo "server {"
    echo "    listen 80;"
    echo "    server_name $DOMAIN;"
    echo "    location /.well-known/acme-challenge/ { root /var/www/certbot; }"
    echo "    include snippets/muhojir-site.conf;"
    echo "}"
  fi
} > /etc/nginx/sites-available/muhojir
ln -sf /etc/nginx/sites-available/muhojir /etc/nginx/sites-enabled/muhojir
if nginx -t 2>&1; then
  systemctl reload nginx
else
  rm -f /etc/nginx/sites-enabled/muhojir
  echo "nginx found an error in the Muhojir config; Muhojir is switched off in nginx, other sites are not affected."
  exit 1
fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$PUBLIC_PORT/tcp"
fi

step "Services: gunicorn and the daily jobs"
cp "$APP"/deploy/muhojir-gunicorn.service "$APP"/deploy/muhojir-daily.service "$APP"/deploy/muhojir-daily.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q muhojir-gunicorn muhojir-daily.timer
systemctl restart muhojir-gunicorn
systemctl start muhojir-daily.timer
# The very first time there are no vacancies yet: import them now, in the background (takes a few minutes).
if ! as_user ".venv/bin/python manage.py shell -c 'from jobs.models import Job; import sys; sys.exit(0 if Job.objects.exists() else 1)'" 2>/dev/null; then
  systemctl start --no-block muhojir-daily.service
  echo "Importing the first vacancies in the background: journalctl -u muhojir-daily -f"
fi

step "Check"
sleep 4
systemctl is-active muhojir-gunicorn
curl -sS -o /dev/null -w "site: HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/"
curl -sS -o /dev/null -w "API:  HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/api/documents/document-types/"

echo
echo "Muhojir:        http://$SERVER_IP:$PUBLIC_PORT/"
echo "Admin account:  cd $APP && sudo -u $APP_USER .venv/bin/python manage.py createsuperuser"
echo "Email password: nano $APP/.env   (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)   then   systemctl restart muhojir-gunicorn"
echo "Logs:           journalctl -u muhojir-gunicorn -f        daily jobs: journalctl -u muhojir-daily"
