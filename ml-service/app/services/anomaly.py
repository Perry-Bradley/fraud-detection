"""Isolation Forest anomaly detection on payment events.

Designed to be robust to small datasets: when there isn't enough history we fall
back to a simple rule-based heuristic so the upstream service still gets a
meaningful answer.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

import numpy as np
from sklearn.ensemble import IsolationForest


def _safe_parse(ts: str) -> datetime:
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(tz=timezone.utc)


def _features(amount: float, history: List[dict]) -> np.ndarray:
    """Build feature row for the candidate payment given its history."""
    amounts = [float(h["amount"]) for h in history] or [0.0]
    mean_amt = float(np.mean(amounts))
    std_amt = float(np.std(amounts)) or 1.0

    now = datetime.now(tz=timezone.utc)
    deltas = []
    for h in history:
        ts = _safe_parse(h["timestamp"])
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        deltas.append((now - ts).total_seconds() / 86400.0)
    avg_gap_days = float(np.mean(deltas)) if deltas else 0.0

    z_score = (amount - mean_amt) / std_amt
    return np.array([
        amount,
        amount / max(mean_amt, 1.0),
        z_score,
        len(history),
        avg_gap_days,
    ]).reshape(1, -1)


def _heuristic(amount: float, history: List[dict]) -> tuple[bool, float]:
    if not history:
        # First payment ever - not anomalous by default.
        return False, 0.0

    amounts = [float(h["amount"]) for h in history]
    mean_amt = float(np.mean(amounts))
    std_amt = float(np.std(amounts)) or 1.0

    z = abs((amount - mean_amt) / std_amt)
    if z > 3:
        return True, min(0.5 + z / 10.0, 0.99)
    return False, float(z / 10.0)


def detect(amount: float, history: List[dict]) -> tuple[bool, float]:
    """Return (is_anomalous, score in [0,1])."""
    same_day_dup = any(
        abs(float(h["amount"]) - amount) < 1
        and (datetime.now(tz=timezone.utc) - _safe_parse(h["timestamp"])).total_seconds() < 86400
        for h in history
    )
    if same_day_dup:
        return True, 0.95

    # Need a minimum amount of training data for IsolationForest.
    if len(history) < 10:
        return _heuristic(amount, history)

    X_train = []
    for i in range(len(history)):
        h_i = history[:i] + history[i + 1:]
        X_train.append(_features(float(history[i]["amount"]), h_i)[0])
    X_train = np.array(X_train)

    model = IsolationForest(
        n_estimators=100,
        contamination="auto",
        random_state=42,
    )
    model.fit(X_train)

    X_new = _features(amount, history)
    pred = model.predict(X_new)[0]  # -1 anomaly, 1 normal
    raw_score = -model.score_samples(X_new)[0]  # higher == more anomalous
    score = float(np.clip((raw_score + 0.5) / 1.5, 0.0, 1.0))

    if pred == -1:
        return True, max(score, 0.6)
    return False, score
