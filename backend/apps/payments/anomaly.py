"""Bridge to the FastAPI ML service for anomaly detection."""
import logging
from django.conf import settings
import requests

logger = logging.getLogger(__name__)


def score_payment(payment) -> tuple[bool, float | None, str]:
    """Returns (is_anomalous, score, reason). Fails open on network errors."""
    try:
        history = list(
            payment.student.payments.exclude(pk=payment.pk).order_by("-payment_date")[:50]
            .values("amount", "payment_date", "method")
        )
        body = {
            "student_id": str(payment.student_id),
            "amount": float(payment.amount),
            "method": payment.method,
            "history": [
                {
                    "amount": float(h["amount"]),
                    "timestamp": h["payment_date"].isoformat(),
                    "method": h["method"],
                }
                for h in history
            ],
        }
        r = requests.post(
            f"{settings.ML_SERVICE_URL}/detect-anomaly",
            json=body,
            timeout=3,
        )
        r.raise_for_status()
        data = r.json()
        return (
            bool(data.get("is_anomalous", False)),
            float(data.get("score", 0.0)),
            str(data.get("reason") or ""),
        )
    except Exception as e:
        logger.warning("Anomaly detection unavailable: %s", e)
        return False, None, ""
