import logging
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment, PaymentIntent
from .serializers import PaymentSerializer, PaymentIntentSerializer
from .receipts import render_receipt_pdf
from .anomaly import score_payment
from .services import promote_intent_to_payment, mark_intent_failed
from .campay import verify_webhook_signature
from apps.accounts.permissions import IsBursaryOrAdmin, IsAdmin
from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("student", "fee_structure", "recorded_by").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsBursaryOrAdmin]
    filterset_fields = ("student", "method", "is_anomalous")
    search_fields = ("receipt_no", "student__full_name", "student__matricule", "reference")
    ordering_fields = ("payment_date", "amount")

    def perform_create(self, serializer):
        payment = serializer.save(recorded_by=self.request.user)
        is_anom, score, reason = score_payment(payment)
        if is_anom or score is not None:
            payment.is_anomalous = is_anom
            payment.anomaly_score = score
            payment.anomaly_reason = reason
            payment.save(update_fields=["is_anomalous", "anomaly_score", "anomaly_reason"])
            if is_anom:
                AuditLog.objects.create(
                    action="ANOMALY_DETECTED",
                    table_name="payments",
                    record_id=str(payment.id),
                    changed_by=self.request.user,
                    new_value={"score": score, "reason": reason, "amount": str(payment.amount)},
                )
                # Notify admins
                from apps.accounts.models import User
                from apps.notifications.models import notify
                for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True):
                    notify(
                        admin,
                        title="Suspicious payment flagged",
                        message=f"Receipt {payment.receipt_no} ({payment.amount} FCFA): {reason or 'unusual pattern'}",
                        kind="danger",
                        link="/staff/anomalies",
                    )
        AuditLog.objects.create(
            action="PAYMENT_CREATED",
            table_name="payments",
            record_id=str(payment.id),
            changed_by=self.request.user,
            new_value={
                "receipt_no": payment.receipt_no,
                "amount": str(payment.amount),
                "student": str(payment.student_id),
            },
        )

    @action(detail=True, methods=["get"])
    def receipt(self, request, pk=None):
        payment = self.get_object()
        pdf = render_receipt_pdf(payment)
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="receipt-{payment.receipt_no}.pdf"'
        return resp

    @action(detail=False, methods=["get"])
    def anomalies(self, request):
        qs = self.get_queryset().filter(is_anomalous=True)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def review(self, request, pk=None):
        """Admin reviews a flagged payment.

        Body: { status: 'open'|'confirmed'|'dismissed'|'investigating', note: '...' }
        """
        from django.utils import timezone
        from apps.audit.models import AuditLog

        payment = self.get_object()
        if not payment.is_anomalous:
            return Response({"detail": "payment is not flagged"}, status=status.HTTP_400_BAD_REQUEST)

        new_status = (request.data.get("status") or "").lower()
        valid = [c[0] for c in Payment.ReviewStatus.choices]
        if new_status not in valid:
            return Response({"detail": f"status must be one of {valid}"}, status=400)

        old = payment.review_status
        payment.review_status = new_status
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.review_note = request.data.get("note", "")
        payment.save(update_fields=["review_status", "reviewed_by", "reviewed_at", "review_note"])

        AuditLog.objects.create(
            action="ANOMALY_REVIEWED",
            table_name="payments",
            record_id=str(payment.id),
            changed_by=request.user,
            old_value={"review_status": old},
            new_value={"review_status": new_status, "note": payment.review_note},
        )
        return Response(self.get_serializer(payment).data)


class CampayWebhookView(APIView):
    """Public webhook endpoint Campay calls when a collect resolves.

    Authentication is via shared-secret HMAC, NOT JWT. We DO NOT trust the
    body until ``verify_webhook_signature`` passes.
    """
    authentication_classes: list = []
    permission_classes: list = []

    def post(self, request):
        sig = request.META.get("HTTP_X_CAMPAY_SIGNATURE") or request.META.get("HTTP_X_SIGNATURE", "")
        if not verify_webhook_signature(request.body, sig):
            logger.warning("[campay-webhook] bad signature from %s", request.META.get("REMOTE_ADDR"))
            return Response({"detail": "invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data or {}
        ext_ref = data.get("external_reference") or data.get("externalReference")
        result_status = (data.get("status") or "").upper()

        if not ext_ref:
            return Response({"detail": "missing external_reference"}, status=400)

        try:
            intent = PaymentIntent.objects.select_related("student").get(id=ext_ref)
        except (PaymentIntent.DoesNotExist, ValueError):
            logger.warning("[campay-webhook] unknown external_reference: %s", ext_ref)
            # Always 200 so Campay doesn't keep retrying a payload we can't match.
            return Response({"detail": "unknown reference"}, status=200)

        if intent.status != PaymentIntent.Status.PENDING:
            return Response({"detail": "already processed"}, status=200)

        if result_status in ("SUCCESSFUL", "SUCCESS"):
            intent.campay_reference = data.get("reference", intent.campay_reference)
            intent.operator = data.get("operator", intent.operator)
            intent.save(update_fields=["campay_reference", "operator", "updated_at"])
            promote_intent_to_payment(intent, raw_callback=data)
        else:
            mark_intent_failed(intent, reason=data.get("reason", result_status), raw_callback=data)

        return Response({"detail": "ok"}, status=200)


class PaymentIntentViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin/bursary read-only access to in-flight intents + a simulate action."""
    queryset = PaymentIntent.objects.select_related("student", "payment").all()
    serializer_class = PaymentIntentSerializer
    permission_classes = [IsBursaryOrAdmin]
    filterset_fields = ("status", "student", "is_stub")
    search_fields = ("campay_reference", "student__matricule", "student__full_name")

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def simulate(self, request, pk=None):
        """Drive the webhook flow manually for demo / when Campay isn't reachable.

        Body: {"outcome": "success" | "fail", "reason": "..."}
        """
        intent = self.get_object()
        if intent.status != PaymentIntent.Status.PENDING:
            return Response({"detail": f"intent already {intent.status}"}, status=400)

        outcome = (request.data.get("outcome") or "success").lower()
        if outcome == "success":
            payment = promote_intent_to_payment(intent, raw_callback={"simulated": True})
            return Response({
                "detail": "simulated success",
                "payment_id": str(payment.id),
                "receipt_no": payment.receipt_no,
            })
        else:
            mark_intent_failed(
                intent,
                reason=request.data.get("reason", "simulated failure"),
                raw_callback={"simulated": True},
            )
            return Response({"detail": "simulated failure"})
