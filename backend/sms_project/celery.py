"""Celery application for background + scheduled tasks.

Broker and result backend both use the Redis instance the app already runs.
Started by the `celery-worker` and `celery-beat` services in docker-compose.
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sms_project.settings")

app = Celery("sms")

# Pull CELERY_* settings from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in every installed app (e.g. apps.payments.tasks).
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
