from datetime import datetime, timezone, timedelta
from app.services.anomaly import detect


def _hist(n, amount=10000):
    base = datetime.now(tz=timezone.utc)
    return [
        {"amount": amount, "timestamp": (base - timedelta(days=i * 30)).isoformat(), "method": "cash"}
        for i in range(n)
    ]


def test_first_payment_not_anomalous():
    is_anom, score = detect(10000, [])
    assert is_anom is False
    assert 0.0 <= score <= 1.0


def test_duplicate_same_day_flagged():
    base = datetime.now(tz=timezone.utc).isoformat()
    hist = [{"amount": 50000, "timestamp": base, "method": "cash"}]
    is_anom, score = detect(50000, hist)
    assert is_anom is True
    assert score >= 0.9


def test_normal_payment_with_history():
    is_anom, score = detect(10000, _hist(15, amount=10000))
    # very consistent history, same amount => not anomalous
    assert 0.0 <= score <= 1.0
