from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, PaymentIntentViewSet, CampayWebhookView

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")
router.register("payment-intents", PaymentIntentViewSet, basename="payment-intent")

urlpatterns = router.urls + [
    path("webhooks/campay/", CampayWebhookView.as_view(), name="campay-webhook"),
]
