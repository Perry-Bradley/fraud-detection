#!/bin/sh
set -e

# Worker/beat containers share this image but must NOT run migrations/seed
# (the web service owns that). Set SKIP_BOOTSTRAP=1 on those services.
if [ "${SKIP_BOOTSTRAP:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_BOOTSTRAP=1 -> starting command without migrations/seed"
  exec "$@"
fi

echo "[entrypoint] Waiting for database..."
python - <<'PY'
import os, time, sys, socket
host = os.environ.get("DB_HOST", "postgres")
port = int(os.environ.get("DB_PORT", "5432"))
for _ in range(60):
    try:
        with socket.create_connection((host, port), timeout=2):
            print("DB reachable")
            sys.exit(0)
    except OSError:
        time.sleep(1)
print("DB unreachable", file=sys.stderr); sys.exit(1)
PY

echo "[entrypoint] Generating migrations (auto)..."
python manage.py makemigrations accounts students fees payments audit analytics portal notifications announcements academics attendance exams timetable admissions hr --noinput

echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput || true

echo "[entrypoint] Bootstrapping superuser (idempotent)..."
python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model
User = get_user_model()
u = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
e = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@school.local")
p = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")
if not User.objects.filter(username=u).exists():
    User.objects.create_superuser(username=u, email=e, password=p, role="admin", full_name="System Admin")
    print(f"Superuser {u} created.")
else:
    print(f"Superuser {u} already exists.")
PY

echo "[entrypoint] Seeding demo data (idempotent)..."
python manage.py seed_demo || true

echo "[entrypoint] Starting: $@"
exec "$@"
