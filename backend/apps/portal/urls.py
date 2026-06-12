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
    MyClassView,
    MySubjectsView,
    MyTimetableView,
    MyResultsView,
    SubmitManualPaymentView,
    MyManualSubmissionsView,
    SignupView,
)

urlpatterns = [
    path("portal/me/", MeView.as_view(), name="portal-me"),
    path("portal/balance/", MyBalanceView.as_view(), name="portal-balance"),
    path("portal/payments/", MyPaymentsView.as_view(), name="portal-payments"),
    path("portal/payments/<uuid:payment_id>/receipt/", MyReceiptView.as_view(), name="portal-receipt"),
    path("portal/change-password/", ChangePasswordView.as_view(), name="portal-change-password"),

    # Academic self-service
    path("portal/class/", MyClassView.as_view(), name="portal-class"),
    path("portal/subjects/", MySubjectsView.as_view(), name="portal-subjects"),
    path("portal/timetable/", MyTimetableView.as_view(), name="portal-timetable"),
    path("portal/results/", MyResultsView.as_view(), name="portal-results"),

    # Online payment (Campay)
    path("portal/pay/", InitiatePaymentView.as_view(), name="portal-pay"),
    path("portal/intents/", MyIntentsView.as_view(), name="portal-intents"),
    path("portal/intents/<uuid:intent_id>/", IntentStatusView.as_view(), name="portal-intent-status"),

    # Manual payment submissions
    path("portal/manual-payments/", SubmitManualPaymentView.as_view(), name="portal-manual-pay"),
    path("portal/manual-payments/list/", MyManualSubmissionsView.as_view(), name="portal-manual-list"),

    # Public student self-registration
    path("auth/signup/", SignupView.as_view(), name="portal-signup"),
]
