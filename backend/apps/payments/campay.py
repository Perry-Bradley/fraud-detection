"""Campay HTTP client for mobile-money collection.

Campay (https://campay.net) aggregates MTN MoMo and Orange Money in Cameroon.
This client handles the collect (debit) flow:

  1. POST /collect/        -> tells Campay to push a USSD prompt to the payer
  2. Webhook               -> Campay calls our public webhook on result
  3. (optional) GET /transaction/{ref}/  -> poll status as a fallback

Stub mode: when ``CAMPAY_API_KEY`` is empty, ``initiate_collect`` returns a
fake response so the system still works in demos. An admin endpoint can then
simulate the webhook callback.
"""
from __future__ import annotations

import hmac
import hashlib
import logging
import uuid
from dataclasses import dataclass
from typing import Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class CollectResult:
    reference: str
    operator: str
    ussd_code: str
    status: str
    stub: bool = False


def _normalize_phone(phone: str) -> str:
    """Campay expects E.164 without the leading '+', e.g. 237670000001."""
    p = phone.replace(" ", "").replace("+", "")
    if p.startswith("00"):
        p = p[2:]
    if p.startswith("6") and len(p) == 9:
        p = "237" + p
    return p


def initiate_collect(
    *,
    phone: str,
    amount: float,
    description: str,
    external_reference: str,
) -> CollectResult:
    """Ask Campay to debit the payer. Returns a reference we can correlate later."""
    if not settings.CAMPAY_API_KEY:
        # Stub: pretend Campay accepted the request.
        logger.info("[campay] STUB collect: %s XAF from %s (ref=%s)", amount, phone, external_reference)
        return CollectResult(
            reference=f"STUB-{uuid.uuid4().hex[:10].upper()}",
            operator="stub",
            ussd_code="*000#",
            status="PENDING",
            stub=True,
        )

    url = f"{settings.CAMPAY_BASE_URL.rstrip('/')}/collect/"
    headers = {
        "Authorization": f"Token {settings.CAMPAY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "amount": str(int(round(amount))),  # Campay expects integer XAF
        "currency": "XAF",
        "from": _normalize_phone(phone),
        "description": description,
        "external_reference": external_reference,
    }
    r = requests.post(url, json=payload, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    return CollectResult(
        reference=data.get("reference", ""),
        operator=data.get("operator", ""),
        ussd_code=data.get("ussd_code", ""),
        status=data.get("status", "PENDING"),
    )


def fetch_status(reference: str) -> Optional[dict]:
    """Poll Campay for the current status of a reference. Returns None on failure."""
    if not settings.CAMPAY_API_KEY:
        return None
    url = f"{settings.CAMPAY_BASE_URL.rstrip('/')}/transaction/{reference}/"
    headers = {"Authorization": f"Token {settings.CAMPAY_API_KEY}"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning("[campay] status poll failed for %s: %s", reference, e)
        return None


def verify_webhook_signature(raw_body: bytes, header_signature: str) -> bool:
    """Verify Campay's HMAC-SHA256 signature.

    The exact header name varies across providers; configure ``CAMPAY_WEBHOOK_SECRET``
    to the shared secret, then we compute HMAC over the raw request body and compare.
    If the secret isn't set we accept the call (suitable for sandbox / demo only).
    """
    secret = settings.CAMPAY_WEBHOOK_SECRET
    if not secret:
        return True
    if not header_signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_signature)
