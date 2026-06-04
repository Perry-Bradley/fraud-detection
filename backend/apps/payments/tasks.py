"""Scheduled Celery tasks that keep payments consistent without manual help.

Why this exists: the Campay webhook is the *primary* signal that a collection
succeeded or failed, but webhooks can be missed (network blips, the server
restarting mid-request). Without a safety net a PaymentIntent could stay
``pending`` forever and the student's money would be in limbo.

``reconcile_pending_intents`` runs every minute (see CELERY_BEAT_SCHEDULE),
polls Campay directly for each in-flight intent, and finalises it the same way
the webhook would — by reusing the shared promote/fail services. So the system
self-heals even if no webhook ever arrives.
"""
from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import PaymentIntent
from .campay import fetch_status
from .services import promote_intent_to_payment, mark_intent_failed

logger = logging.getLogger(__name__)

_SUCCESS_STATES = {"SUCCESSFUL", "SUCCESS"}
_FAILURE_STATES = {"FAILED", "CANCELLED", "CANCELED"}


@shared_task(name="apps.payments.tasks.reconcile_pending_intents")
def reconcile_pending_intents() -> dict:
    """Poll Campay for every pending, non-stub intent and finalise it.

    Returns a small summary dict (handy in the Celery result log / Flower).
    """
    qs = (
        PaymentIntent.objects.select_related("student")
        .filter(status=PaymentIntent.Status.PENDING, is_stub=False)
        .exclude(campay_reference="")
    )

    checked = promoted = failed = 0
    for intent in qs.iterator():
        checked += 1
        data = fetch_status(intent.campay_reference)
        if not data:
            # Campay unreachable or no API key — leave it for the next tick.
            continue

        state = (data.get("status") or "").upper()
        if state in _SUCCESS_STATES:
            # Re-fetch under a row lock-free guard; promote is idempotent.
            intent.operator = data.get("operator", intent.operator)
            intent.save(update_fields=["operator", "updated_at"])
            promote_intent_to_payment(intent, raw_callback={"reconciled": True, **data})
            promoted += 1
            logger.info("[reconcile] intent %s promoted via poll", intent.id)
        elif state in _FAILURE_STATES:
            mark_intent_failed(
                intent,
                reason=data.get("reason", state),
                raw_callback={"reconciled": True, **data},
            )
            failed += 1
            logger.info("[reconcile] intent %s marked failed via poll", intent.id)
        # else: still pending on Campay's side — check again next tick.

    summary = {"checked": checked, "promoted": promoted, "failed": failed}
    if checked:
        logger.info("[reconcile] %s", summary)
    return summary


@shared_task(name="apps.payments.tasks.expire_stale_intents")
def expire_stale_intents() -> dict:
    """Mark intents that have been pending too long as EXPIRED.

    Prevents the pending list from growing forever with abandoned attempts
    (student never approved the USSD prompt, stub demos left open, etc.).
    """
    cutoff = timezone.now() - timedelta(minutes=settings.PAYMENT_INTENT_EXPIRY_MINUTES)
    stale = PaymentIntent.objects.filter(
        status=PaymentIntent.Status.PENDING,
        created_at__lt=cutoff,
    )
    count = stale.update(
        status=PaymentIntent.Status.EXPIRED,
        failure_reason="Expired: no confirmation received in time",
        updated_at=timezone.now(),
    )
    if count:
        logger.info("[expire] %s stale intent(s) expired", count)
    return {"expired": count}
