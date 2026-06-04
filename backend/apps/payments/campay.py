"""Campay HTTP client for mobile-money collection.

Campay (https://campay.net) aggregates MTN MoMo and Orange Money in Cameroon.
This client handles the collect (debit) flow:

  1. POST /api/token/      -> exchange username/password for an access token
                              (skipped if a permanent CAMPAY_API_KEY is set)
  2. POST /api/collect/    -> tells Campay to push a USSD prompt to the payer
  3. Webhook               -> Campay calls our public webhook on result
  4. GET /api/transaction/{ref}/ -> poll status as a fallback (the Celery
                              reconcile task uses this so payments still finalise
                              even when no public webhook is reachable, e.g. local
                              demos)

Stub mode: when NO credentials are configured, ``initiate_collect`` returns a
fake response so the system still works in demos. An admin endpoint can then
simulate the callback.
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
from django.core.cache import cache

logger = logging.getLogger(__name__)

_TOKEN_CACHE_KEY = "campay:access_token"


@dataclass
class CollectResult:
    reference: str
    operator: str
    ussd_code: str
    status: str
    stub: bool = False


def is_configured() -> bool:
    """True when we have real credentials (permanent token OR username/password)."""
    return bool(
        settings.CAMPAY_API_KEY
        or (settings.CAMPAY_USERNAME and settings.CAMPAY_PASSWORD)
    )


def _api(path: str) -> str:
    """Build a Campay API URL, tolerating a base with or without a trailing /api."""
    base = settings.CAMPAY_BASE_URL.rstrip("/")
    if base.endswith("/api"):
        base = base[:-4]
    return f"{base}/api/{path.lstrip('/')}"


def _normalize_phone(phone: str) -> str:
    """Campay expects E.164 without the leading '+', e.g. 237670000001."""
    p = phone.replace(" ", "").replace("+", "")
    if p.startswith("00"):
        p = p[2:]
    if p.startswith("6") and len(p) == 9:
        p = "237" + p
    return p


def _get_token() -> Optional[str]:
    """Return a usable Campay access token, or None if unconfigured.

    A permanent CAMPAY_API_KEY wins. Otherwise we exchange username/password at
    /api/token/ and cache the result in Redis (Campay tokens are long-lived; we
    refresh every 50 minutes to be safe).
    """
    if settings.CAMPAY_API_KEY:
        return settings.CAMPAY_API_KEY
    if not (settings.CAMPAY_USERNAME and settings.CAMPAY_PASSWORD):
        return None

    cached = cache.get(_TOKEN_CACHE_KEY)
    if cached:
        return cached
    try:
        r = requests.post(
            _api("token/"),
            json={
                "username": settings.CAMPAY_USERNAME,
                "password": settings.CAMPAY_PASSWORD,
            },
            timeout=15,
        )
        r.raise_for_status()
        token = r.json().get("token")
        if token:
            cache.set(_TOKEN_CACHE_KEY, token, 60 * 50)
        return token
    except Exception as e:
        logger.warning("[campay] token request failed: %s", e)
        return None


def initiate_collect(
    *,
    phone: str,
    amount: float,
    description: str,
    external_reference: str,
) -> CollectResult:
    """Ask Campay to debit the payer. Returns a reference we can correlate later."""
    token = _get_token()
    if token is None:
        # Stub: pretend Campay accepted the request.
        logger.info("[campay] STUB collect: %s XAF from %s (ref=%s)", amount, phone, external_reference)
        return CollectResult(
            reference=f"STUB-{uuid.uuid4().hex[:10].upper()}",
            operator="stub",
            ussd_code="*000#",
            status="PENDING",
            stub=True,
        )

    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "amount": str(int(round(amount))),  # Campay expects integer XAF
        "currency": "XAF",
        "from": _normalize_phone(phone),
        "description": description,
        "external_reference": external_reference,
    }
    r = requests.post(_api("collect/"), json=payload, headers=headers, timeout=15)
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
    token = _get_token()
    if token is None:
        return None
    headers = {"Authorization": f"Token {token}"}
    try:
        r = requests.get(_api(f"transaction/{reference}/"), headers=headers, timeout=10)
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
