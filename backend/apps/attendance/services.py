"""Absence alerting.

When a student is marked absent we notify the family. In-app notifications are
delivered immediately; SMS/WhatsApp is stubbed behind ``_send_sms`` so a real
gateway (Twilio, a local aggregator) can be dropped in later without touching
callers. Pairs with the messaging plans in the roadmap.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _send_sms(phone: str, message: str) -> None:
    # TODO: wire a real SMS/WhatsApp gateway here.
    logger.info("[sms-stub] to %s: %s", phone, message)


def send_absence_alert(attendance) -> None:
    """Notify the student's account + guardian phone that they were absent."""
    student = attendance.student
    msg = (
        f"{student.full_name} ({student.matricule}) was marked "
        f"{attendance.get_status_display().lower()} on {attendance.date}."
    )

    # In-app notification to the linked student account, if any.
    if getattr(student, "user_id", None):
        try:
            from apps.notifications.models import notify
            notify(
                student.user,
                title="Attendance alert",
                message=msg,
                kind="warning",
                link="/portal",
            )
        except Exception:  # notifications are best-effort
            logger.exception("in-app absence alert failed for %s", student.matricule)

    # SMS/WhatsApp to the guardian/contact number (stubbed).
    phone = student.contact_phone or ""
    if phone:
        _send_sms(phone, msg)

    attendance.alert_sent = True
    attendance.save(update_fields=["alert_sent", "updated_at"])
