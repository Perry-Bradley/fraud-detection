from django.urls import path
from .views import (
    SummaryView,
    PaymentTrendsView,
    ClassBreakdownView,
    MethodBreakdownView,
    TopDefaultersView,
    AnomalyTrendView,
    ActivityFeedView,
    RecentPaymentsView,
    IntentFunnelView,
)

urlpatterns = [
    path("reports/summary/", SummaryView.as_view(), name="reports-summary"),
    path("reports/payment-trends/", PaymentTrendsView.as_view(), name="reports-trends"),
    path("reports/class-breakdown/", ClassBreakdownView.as_view(), name="reports-classes"),
    path("reports/method-breakdown/", MethodBreakdownView.as_view(), name="reports-methods"),
    path("reports/top-defaulters/", TopDefaultersView.as_view(), name="reports-defaulters"),
    path("reports/anomaly-trend/", AnomalyTrendView.as_view(), name="reports-anomaly-trend"),
    path("reports/activity-feed/", ActivityFeedView.as_view(), name="reports-activity"),
    path("reports/recent-payments/", RecentPaymentsView.as_view(), name="reports-recent"),
    path("reports/intent-funnel/", IntentFunnelView.as_view(), name="reports-intents"),
]
