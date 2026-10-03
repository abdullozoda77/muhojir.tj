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
#   Celery worker sends the emails in the background and runs the daily jobs; Celery Beat starts them every day
#   (06:00 new vacancies, 06:30 document reminders). Their queue is Redis database 14.
# Other projects on this server (Rohat on 8030/8031, other students' apps) are not touched.
set -euo pipefail

APP_USER=romin
APP=/home/$APP_USER/muhojir
PUBLIC_PORT=8040   # the address people open: http://<server>:8040
APP_PORT=8041      # gunicorn, reachable only from nginx
REDIS_DB=13        # live notifications (Rohat uses 12)
CELERY_DB=14       # Celery's queue
DOMAIN=king.tj     # must point to this server in DNS (@ and www); empty = by port only
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
# Adds an empty KEY= line to .env only if it is not there; a key already written there is never touched.
add_env_if_missing() { grep -q "^$1=" "$APP/.env" || echo "$1=" >> "$APP/.env"; }
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

# The AI assistant (the chat in the corner). One key is enough: Gemini from https://aistudio.google.com/apikey
# or Claude from https://console.anthropic.com. While both are empty, the chat says it is not set up.
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
ENV
  echo "Created $APP/.env: add the email address and app password later (see the end of this script)."
fi
if [ -n "$DOMAIN" ]; then HOSTS="$DOMAIN,www.$DOMAIN,$SERVER_IP"; else HOSTS="$SERVER_IP"; fi
add_env_if_missing GEMINI_API_KEY
add_env_if_missing ANTHROPIC_API_KEY
set_env DEBUG False
set_env REDIS_URL "redis://127.0.0.1:6379/$REDIS_DB"
set_env CELERY_BROKER_URL "redis://127.0.0.1:6379/$CELERY_DB"
set_env ALLOWED_HOSTS "$HOSTS,localhost,127.0.0.1"
ORIGINS="http://$SERVER_IP:$PUBLIC_PORT"
[ -n "$DOMAIN" ] && ORIGINS="https://$DOMAIN,https://www.$DOMAIN,http://$DOMAIN,http://www.$DOMAIN,$ORIGINS"
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

step "nginx${DOMAIN:+ and HTTPS for $DOMAIN}"
install -m 644 "$APP/deploy/nginx-muhojir-site.conf" /etc/nginx/snippets/muhojir-site.conf
mkdir -p /var/www/certbot
CERT_DIR=/etc/letsencrypt/live/$DOMAIN

# Writes Muhojir's nginx config: only by port, the domain over "http" before there is a certificate,
# or "https" after. Only Muhojir's names and port; Rohat and other sites are not touched.
write_nginx() {
  {
    echo "# Muhojir: generated by deploy/setup.sh, do not edit here (changes are lost on the next update)."
    # The IP address keeps working on its own too (the site does not depend on the domain's DNS).
    echo "server {"
    echo "    listen $PUBLIC_PORT;"
    echo "    server_name _;"
    echo "    include snippets/muhojir-site.conf;"
    echo "}"
    if [ "$1" = https ]; then
      echo "server {"
      echo "    listen 80;"
      echo "    server_name $DOMAIN www.$DOMAIN;"
      echo "    location /.well-known/acme-challenge/ { root /var/www/certbot; }"
      echo "    location / { return 301 https://$DOMAIN\$request_uri; }"
      echo "}"
      # www.king.tj → king.tj, so the site always has one address.
      echo "server {"
      echo "    listen 443 ssl http2;"
      echo "    server_name www.$DOMAIN;"
      echo "    ssl_certificate $CERT_DIR/fullchain.pem;"
      echo "    ssl_certificate_key $CERT_DIR/privkey.pem;"
      echo "    return 301 https://$DOMAIN\$request_uri;"
      echo "}"
      echo "server {"
      echo "    listen 443 ssl http2;"
      echo "    server_name $DOMAIN;"
      echo "    ssl_certificate $CERT_DIR/fullchain.pem;"
      echo "    ssl_certificate_key $CERT_DIR/privkey.pem;"
      echo "    ssl_protocols TLSv1.2 TLSv1.3;"
      echo "    ssl_session_cache shared:muhojir_ssl:10m;"
      echo "    include snippets/muhojir-site.conf;"
      echo "}"
    elif [ "$1" = http ]; then
      echo "server {"
      echo "    listen 80;"
      echo "    server_name $DOMAIN www.$DOMAIN;"
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
}

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow "$PUBLIC_PORT/tcp"
  [ -n "$DOMAIN" ] && { ufw allow 80/tcp; ufw allow 443/tcp; }
fi

if [ -z "$DOMAIN" ]; then
  write_nginx port
  SITE_URL=http://$SERVER_IP:$PUBLIC_PORT
elif [ -f "$CERT_DIR/fullchain.pem" ]; then
  write_nginx https
else
  write_nginx http
  command -v certbot >/dev/null || { apt-get update -qq && apt-get install -y -qq certbot; }
  echo
  echo "Getting a free HTTPS certificate for $DOMAIN and www.$DOMAIN from Let's Encrypt."
  echo "certbot asks for your email (for expiry warnings) and to accept the Let's Encrypt terms."
  if certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "www.$DOMAIN" --cert-name "$DOMAIN" --deploy-hook "systemctl reload nginx"; then
    write_nginx https
  else
    echo "No certificate yet: the site works on http://$DOMAIN. Check that $DOMAIN and www.$DOMAIN point to $SERVER_IP, then run this script again."
  fi
fi
if [ -n "$DOMAIN" ]; then
  if [ -f "$CERT_DIR/fullchain.pem" ]; then
    SITE_URL=https://$DOMAIN
    set_env HTTPS True   # login cookies of the admin only over HTTPS
  else
    SITE_URL=http://$DOMAIN
    set_env HTTPS False
  fi
fi

step "Services: gunicorn, Celery worker, Celery beat"
# An earlier version used a systemd timer for the daily jobs; Celery Beat does them now.
if [ -e /etc/systemd/system/muhojir-daily.timer ]; then
  systemctl disable -q --now muhojir-daily.timer || true
  rm -f /etc/systemd/system/muhojir-daily.timer /etc/systemd/system/muhojir-daily.service
fi
cp "$APP"/deploy/muhojir-gunicorn.service "$APP"/deploy/muhojir-celery.service "$APP"/deploy/muhojir-celerybeat.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q muhojir-gunicorn muhojir-celery muhojir-celerybeat
systemctl restart muhojir-gunicorn muhojir-celery muhojir-celerybeat
# The very first time there are no vacancies yet: the worker imports them now, in the background (a few minutes).
if ! as_user ".venv/bin/python manage.py shell -c 'from jobs.models import Job; import sys; sys.exit(0 if Job.objects.exists() else 1)'" 2>/dev/null; then
  as_user ".venv/bin/celery -A core call jobs.tasks.import_jobs" >/dev/null
  echo "Importing the first vacancies in the background: journalctl -u muhojir-celery -f"
fi

step "Check"
sleep 4
systemctl is-active muhojir-gunicorn muhojir-celery muhojir-celerybeat
curl -sS -o /dev/null -w "site (http://$SERVER_IP:$PUBLIC_PORT): HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/"
curl -sS -o /dev/null -w "API:  HTTP %{http_code}\n" "http://127.0.0.1:$PUBLIC_PORT/api/documents/document-types/"

echo
if [ -n "$DOMAIN" ]; then
  # Checked on this server itself (--resolve), so the check works even if the domain's DNS is broken.
  curl -sS -o /dev/null -w "site ($SITE_URL): HTTP %{http_code}\n" --resolve "$DOMAIN:443:127.0.0.1" --resolve "$DOMAIN:80:127.0.0.1" "$SITE_URL/" || true
  getent hosts "$DOMAIN" >/dev/null || echo "Warning: $DOMAIN does not resolve in DNS yet; the site is reachable at http://$SERVER_IP:$PUBLIC_PORT/"
fi

echo
echo "Muhojir:        $SITE_URL/  (also http://$SERVER_IP:$PUBLIC_PORT/)"
echo "Admin account:  cd $APP && sudo -u $APP_USER .venv/bin/python manage.py createsuperuser"
echo "Email password: nano $APP/.env   (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)   then   systemctl restart muhojir-gunicorn muhojir-celery"
echo "AI assistant:   nano $APP/.env   (GEMINI_API_KEY or ANTHROPIC_API_KEY)   then   systemctl restart muhojir-gunicorn"
echo "Logs:           journalctl -u muhojir-gunicorn -u muhojir-celery -u muhojir-celerybeat -f"
