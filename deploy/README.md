# Deploying Muhojir

```
Browser ──► nginx http://31.25.238.204:8040 ──► frontend/dist (React), /static, /media
                                            └► /api /admin /swagger /redoc and WebSocket /ws/
                                               ──► gunicorn 127.0.0.1:8041 (Django ASGI, Uvicorn workers)
gunicorn workers ◄──► Redis (db 13) — live notifications reach every open tab
Django ──► Redis (db 14) ──► Celery worker: emails in the background, daily jobs
Celery beat: every day 06:00 import_jobs (vacancies + alerts), 06:30 send_reminders
```

Runs next to Rohat (8030/8031) on the same server without touching it: own ports, own services, own Redis database.

## First install (as root on the server)

```bash
sudo -u romin git clone https://github.com/abdullozoda77/muhojir.tj.git /home/romin/muhojir
bash /home/romin/muhojir/deploy/setup.sh
cd /home/romin/muhojir && sudo -u romin .venv/bin/python manage.py createsuperuser
```

Then put the email sender in `.env` (the codes for sign-up and password):

```bash
nano /home/romin/muhojir/.env        # EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
systemctl restart muhojir-gunicorn muhojir-celery
```

## Update after new commits on GitHub

```bash
bash /home/romin/muhojir/deploy/update.sh
```

## Useful

- Logs: `journalctl -u muhojir-gunicorn -u muhojir-celery -u muhojir-celerybeat -f`
- Run the daily jobs now: `cd /home/romin/muhojir && sudo -u romin .venv/bin/celery -A core call jobs.tasks.import_jobs`
  (and `documents.tasks.send_reminders`)
- When there is a domain: set `DOMAIN=` at the top of `setup.sh` and run it again.

The server database is separate from the laptop one: accounts are made again there.
