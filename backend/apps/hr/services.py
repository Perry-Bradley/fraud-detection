"""Salary disbursement: create a SalaryPayment and push it out via Campay.

Mirrors the inbound collection flow in apps.payments but in the opposite
direction (money out to staff). Pending non-stub payouts are reconciled by a
Celery task, so a payout still finalises even if no webhook arrives.
"""
from __future__ import annotations

import logging

from django.db import transaction

from apps.payments.campay import disburse, fetch_status
from .models import SalaryPayment

logger = logging.getLogger(__name__)

_SUCCESS = {"SUCCESSFUL", "SUCCESS"}
_FAILURE = {"FAILED", "CANCELLED", "CANCELED"}


@transaction.atomic
def disburse_salary(*, staff, amount, period: str = "", phone: str = "", actor=None) -> SalaryPayment:
    """Create a SalaryPayment and ask Campay to send the money."""
    phone = (phone or staff.phone or "").strip()
    payment = SalaryPayment.objects.create(
        staff=staff,
        amount=amount,
        phone=phone,
        period=period,
        disbursed_by=actor,
    )

    if not phone:
        payment.status = SalaryPayment.Status.FAILED
        payment.failure_reason = "No phone number on file for this staff member"
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
        return payment

    try:
        result = disburse(
            phone=phone,
            amount=float(amount),
            description=f"Salary{(' - ' + period) if period else ''} - {staff.full_name}",
            external_reference=str(payment.id),
        )
    except Exception as e:  # provider unreachable
        logger.exception("Campay disburse failed for salary %s", payment.id)
        payment.status = SalaryPayment.Status.FAILED
        payment.failure_reason = str(e)[:255]
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
        return payment

    payment.reference = result.reference
    payment.operator = result.operator
    payment.is_stub = result.stub
    state = (result.status or "").upper()
    if state in _SUCCESS:
        payment.status = SalaryPayment.Status.SUCCESSFUL
    elif state in _FAILURE:
        payment.status = SalaryPayment.Status.FAILED
        payment.failure_reason = state
    else:
        payment.status = SalaryPayment.Status.PENDING
    payment.save(update_fields=[
        "reference", "operator", "is_stub", "status", "failure_reason", "updated_at",
    ])

    _audit(payment, actor)
    return payment


def reconcile_salary_payment(payment: SalaryPayment) -> bool:
    """Poll Campay for a pending payout's status. Returns True if it changed."""
    if payment.status != SalaryPayment.Status.PENDING or payment.is_stub or not payment.reference:
        return False
    data = fetch_status(payment.reference)
    if not data:
        return False
    state = (data.get("status") or "").upper()
    if state in _SUCCESS:
        payment.status = SalaryPayment.Status.SUCCESSFUL
    elif state in _FAILURE:
        payment.status = SalaryPayment.Status.FAILED
        payment.failure_reason = data.get("reason", state)
    else:
        return False
    payment.raw_callback = {"reconciled": True, **data}
    payment.save(update_fields=["status", "failure_reason", "raw_callback", "updated_at"])
    return True


def _audit(payment: SalaryPayment, actor) -> None:
    try:
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            action="SALARY_DISBURSED",
            table_name="hr_salarypayment",
            record_id=str(payment.id),
            changed_by=actor,
            new_value={
                "staff": payment.staff.staff_id,
                "amount": str(payment.amount),
                "status": payment.status,
                "is_stub": payment.is_stub,
            },
        )
    except Exception:
        logger.exception("audit log for salary %s failed", payment.id)
