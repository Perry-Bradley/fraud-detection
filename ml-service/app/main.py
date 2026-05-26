"""FastAPI ML service - anomaly detection + light analytics."""
from __future__ import annotations

import statistics
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from .schemas import (
    AnomalyRequest,
    AnomalyResponse,
    TrendRequest,
    ForecastResponse,
)
from .services.anomaly import detect

app = FastAPI(
    title="School Fees ML Service",
    version="1.0.0",
    description="Anomaly detection and light analytics over payment events.",
)

# Prometheus metrics at /metrics
Instrumentator().instrument(app).expose(app)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/detect-anomaly", response_model=AnomalyResponse)
def detect_anomaly(req: AnomalyRequest) -> AnomalyResponse:
    history = [h.model_dump() for h in req.history]
    is_anom, score = detect(req.amount, history)
    reason = None
    if is_anom:
        if not history:
            reason = "First-ever payment"
        elif any(abs(h["amount"] - req.amount) < 1 for h in history):
            reason = "Duplicate amount detected"
        else:
            reason = "Unusual amount or frequency"
    return AnomalyResponse(is_anomalous=is_anom, score=round(score, 4), reason=reason)


@app.post("/analytics/forecast", response_model=ForecastResponse)
def forecast(req: TrendRequest) -> ForecastResponse:
    """Naive forecast: mean of last 3 totals + small drift."""
    totals = [float(p.get("total", 0)) for p in req.points if p.get("total") is not None]
    if not totals:
        return ForecastResponse(next_period_estimate=0.0, confidence=0.0)
    window = totals[-3:] if len(totals) >= 3 else totals
    estimate = float(statistics.mean(window))
    spread = float(statistics.pstdev(totals)) if len(totals) > 1 else 0.0
    confidence = 1.0 / (1.0 + (spread / max(estimate, 1.0)))
    return ForecastResponse(
        next_period_estimate=round(estimate, 2),
        confidence=round(confidence, 4),
    )
