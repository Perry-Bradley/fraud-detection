"""Scheduled reconciliation for outbound salary disbursements.

A pending payout finalises even if no webhook arrives: every minute we poll
Campay for each pending, non-stub SalaryPayment and update its status.
"""
import logging

from celery import shared_task

from .models import SalaryPayment
from .services import reconcile_salary_payment

logger = logging.getLogger(__name__)


@shared_task(name="apps.hr.tasks.reconcile_pending_disbursements")
def reconcile_pending_disbursements() -> dict:
    qs = (
        SalaryPayment.objects.filter(status=SalaryPayment.Status.PENDING, is_stub=False)
        .exclude(reference="")
    )
    checked = updated = 0
    for payment in qs.iterator():
        checked += 1
        if reconcile_salary_payment(payment):
            updated += 1
    if checked:
        logger.info("[salary-reconcile] checked=%s updated=%s", checked, updated)
    return {"checked": checked, "updated": updated}
