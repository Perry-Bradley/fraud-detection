from typing import List, Optional
from pydantic import BaseModel, Field


class HistoricalPayment(BaseModel):
    amount: float
    timestamp: str
    method: Optional[str] = None


class AnomalyRequest(BaseModel):
    student_id: str
    amount: float = Field(gt=0)
    method: Optional[str] = None
    history: List[HistoricalPayment] = Field(default_factory=list)


class AnomalyResponse(BaseModel):
    is_anomalous: bool
    score: float
    reason: Optional[str] = None


class TrendRequest(BaseModel):
    points: List[dict]


class ForecastResponse(BaseModel):
    next_period_estimate: float
    confidence: float
