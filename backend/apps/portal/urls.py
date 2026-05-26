from django.urls import path
from .views import (
    MeView,
    MyBalanceView,
    MyPaymentsView,
    MyReceiptView,
    ChangePasswordView,
    InitiatePaymentView,
    IntentStatusView,
    MyIntentsView,
)

urlpatterns = [
    path("portal/me/", MeView.as_view(), name="portal-me"),
    path("portal/balance/", MyBalanceView.as_view(), name="portal-balance"),
    path("portal/payments/", MyPaymentsView.as_view(), name="portal-payments"),
    path("portal/payments/<uuid:payment_id>/receipt/", MyReceiptView.as_view(), name="portal-receipt"),
    path("portal/change-password/", ChangePasswordView.as_view(), name="portal-change-password"),

    # Online payment (Campay)
    path("portal/pay/", InitiatePaymentView.as_view(), name="portal-pay"),
    path("portal/intents/", MyIntentsView.as_view(), name="portal-intents"),
    path("portal/intents/<uuid:intent_id>/", IntentStatusView.as_view(), name="portal-intent-status"),
]
