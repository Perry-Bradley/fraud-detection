# =====================================================
# Django backend - multi-stage Dockerfile
# =====================================================
FROM python:3.14-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps for psycopg2 + healthcheck wget
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        wget \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Run migrations + create superuser + start gunicorn
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000

# Non-root user for security
RUN useradd -m -u 1000 django && chown -R django:django /app
USER django

ENTRYPOINT ["/entrypoint.sh"]
# Shell form so ${PORT} expands — PaaS platforms (Railway/Render) inject PORT.
# Falls back to 5000 for local docker-compose.
CMD gunicorn sms_project.wsgi:application --bind 0.0.0.0:${PORT:-5000} --workers 3 --access-logfile -
