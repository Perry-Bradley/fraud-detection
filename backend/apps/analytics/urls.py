from django.urls import path
from .views import SummaryView, PaymentTrendsView, ClassBreakdownView

urlpatterns = [
    path("reports/summary/", SummaryView.as_view(), name="reports-summary"),
    path("reports/payment-trends/", PaymentTrendsView.as_view(), name="reports-trends"),
    path("reports/class-breakdown/", ClassBreakdownView.as_view(), name="reports-classes"),
]
