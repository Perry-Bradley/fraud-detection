"""Promotion logic: turn a successful PaymentIntent into a real Payment.

Shared by the Campay webhook and the admin "simulate" endpoint so both code
paths run anomaly detection and write the same audit-log entries.
"""
from __future__ import annotations

import logging
from django.db import transaction

from .models import Payment, PaymentIntent
from .anomaly import score_payment

logger = logging.getLogger(__name__)


@transaction.atomic
def promote_intent_to_payment(intent: PaymentIntent, raw_callback: dict | None = None) -> Payment:
    """Idempotent: if the intent already has a Payment, return it."""
    if intent.payment_id:
        return intent.payment

    payment = Payment.objects.create(
        student=intent.student,
        amount=intent.amount,
        method=Payment.Method.MOBILE,
        reference=intent.campay_reference or intent.external_reference,
        recorded_by=intent.initiated_by,
        notes=f"Online payment via Campay ({intent.operator or 'mobile_money'})",
    )

    intent.status = PaymentIntent.Status.SUCCESSFUL
    intent.payment = payment
    if raw_callback is not None:
        intent.raw_callback = raw_callback
    intent.save(update_fields=["status", "payment", "raw_callback", "updated_at"])

    # Run anomaly detection (fails open if ML service is down)
    is_anom, score = score_payment(payment)
    if is_anom or score is not None:
        payment.is_anomalous = is_anom
        payment.anomaly_score = score
        payment.save(update_fields=["is_anomalous", "anomaly_score"])

    # Audit trail
    from apps.audit.models import AuditLog
    AuditLog.objects.create(
        action="PAYMENT_CREATED_ONLINE",
        table_name="payments",
        record_id=str(payment.id),
        changed_by=intent.initiated_by,
        new_value={
            "intent": str(intent.id),
            "receipt_no": payment.receipt_no,
            "amount": str(payment.amount),
            "operator": intent.operator,
            "is_stub": intent.is_stub,
        },
    )

    # Notify the student of a successful payment
    if intent.student.user_id:
        from apps.notifications.models import notify
        notify(
            intent.student.user,
            title="Payment received",
            message=f"Receipt {payment.receipt_no} for {payment.amount} FCFA has been issued.",
            kind="success",
            link="/portal/payments",
        )

    if is_anom:
        AuditLog.objects.create(
            action="ANOMALY_DETECTED",
            table_name="payments",
            record_id=str(payment.id),
            changed_by=intent.initiated_by,
            new_value={"score": score, "amount": str(payment.amount)},
        )
        # Fan out to all admins so they can investigate
        from apps.accounts.models import User
        from apps.notifications.models import notify
        for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
            notify(
                admin,
                title="Suspicious payment flagged",
                message=f"Receipt {payment.receipt_no} ({payment.amount} FCFA) was flagged by the fraud detector.",
                kind="danger",
                link="/staff/payments?is_anomalous=true",
            )

    return payment


def mark_intent_failed(intent: PaymentIntent, reason: str = "", raw_callback: dict | None = None) -> None:
    intent.status = PaymentIntent.Status.FAILED
    intent.failure_reason = reason[:255]
    if raw_callback is not None:
        intent.raw_callback = raw_callback
    intent.save(update_fields=["status", "failure_reason", "raw_callback", "updated_at"])
