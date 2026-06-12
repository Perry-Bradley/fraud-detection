from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PaymentIntentViewSet, CampayWebhookView, ManualSubmissionViewSet

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")
router.register("payment-intents", PaymentIntentViewSet, basename="payment-intent")
router.register("manual-submissions", ManualSubmissionViewSet, basename="manual-submission")

urlpatterns = router.urls + [
    path("webhooks/campay/", CampayWebhookView.as_view(), name="campay-webhook"),
]
