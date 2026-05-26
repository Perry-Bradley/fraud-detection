"""Student portal endpoints - everything is scoped to request.user.student_profile.

Students authenticate with the same JWT flow as staff but their role is
``student``, which means staff endpoints reject them. They can only see their
own profile, balance, payments and receipts.
"""
import logging
from decimal import Decimal, InvalidOperation

from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStudent
from apps.payments.models import Payment, PaymentIntent
from apps.payments.receipts import render_receipt_pdf
from apps.payments.serializers import PaymentSerializer, PaymentIntentSerializer
from apps.payments.campay import initiate_collect
from apps.students.serializers import StudentSerializer

logger = logging.getLogger(__name__)


def _get_my_student(request):
    student = getattr(request.user, "student_profile", None)
    if student is None:
        raise Http404("No student profile linked to this account.")
    return student


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student = _get_my_student(request)
        return Response(StudentSerializer(student).data)


class MyBalanceView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        return Response({
            "matricule": s.matricule,
            "full_name": s.full_name,
            "class_name": s.class_name,
            "total_due": s.total_due(),
            "total_paid": s.total_paid(),
            "outstanding": s.outstanding(),
        })


class MyPaymentsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        qs = Payment.objects.filter(student=s).order_by("-payment_date")
        return Response(PaymentSerializer(qs, many=True).data)


class MyReceiptView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, payment_id):
        s = _get_my_student(request)
        payment = get_object_or_404(Payment, id=payment_id, student=s)
        pdf = render_receipt_pdf(payment)
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="receipt-{payment.receipt_no}.pdf"'
        return resp


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old = request.data.get("old_password")
        new = request.data.get("new_password")
        if not new or len(new) < 6:
            return Response({"detail": "new_password must be at least 6 chars"}, status=400)
        if not request.user.check_password(old or ""):
            return Response({"detail": "Old password incorrect"}, status=400)
        request.user.set_password(new)
        request.user.save(update_fields=["password"])
        return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)


class InitiatePaymentView(APIView):
    """Student kicks off a Campay mobile-money charge.

    Creates a PaymentIntent (status=pending), calls Campay's collect API, and
    returns the intent so the UI can poll. The actual Payment row is created
    later by the webhook (or by the admin simulate endpoint in stub mode).
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        s = _get_my_student(request)

        # Validate amount
        try:
            amount = Decimal(str(request.data.get("amount", "")))
        except (InvalidOperation, TypeError):
            return Response({"detail": "amount must be a number"}, status=400)
        if amount <= 0:
            return Response({"detail": "amount must be > 0"}, status=400)

        outstanding = s.outstanding()
        if amount > outstanding and outstanding > 0:
            # Allow overpayment but warn the caller in the response.
            pass

        phone = (request.data.get("phone") or "").strip()
        if not phone:
            return Response({"detail": "phone is required"}, status=400)

        intent = PaymentIntent.objects.create(
            student=s,
            amount=amount,
            phone=phone,
            description=f"School fees - {s.matricule}",
            initiated_by=request.user,
        )

        try:
            result = initiate_collect(
                phone=phone,
                amount=float(amount),
                description=intent.description,
                external_reference=intent.external_reference,
            )
        except Exception as e:
            logger.exception("Campay collect failed for intent %s", intent.id)
            intent.status = PaymentIntent.Status.FAILED
            intent.failure_reason = str(e)[:255]
            intent.save(update_fields=["status", "failure_reason", "updated_at"])
            return Response({"detail": "Payment provider unreachable", "intent_id": str(intent.id)}, status=502)

        intent.campay_reference = result.reference
        intent.operator = result.operator
        intent.ussd_code = result.ussd_code
        intent.is_stub = result.stub
        intent.save(update_fields=["campay_reference", "operator", "ussd_code", "is_stub", "updated_at"])

        return Response({
            "intent_id": str(intent.id),
            "status": intent.status,
            "campay_reference": intent.campay_reference,
            "operator": intent.operator,
            "ussd_code": intent.ussd_code,
            "is_stub": intent.is_stub,
            "message": (
                "Stub mode - no real charge initiated. Ask an admin to simulate the callback."
                if intent.is_stub
                else "Check your phone and approve the prompt to complete payment."
            ),
        }, status=201)


class IntentStatusView(APIView):
    """Student polls this to see whether their initiated payment landed yet."""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, intent_id):
        s = _get_my_student(request)
        intent = get_object_or_404(PaymentIntent, id=intent_id, student=s)
        return Response(PaymentIntentSerializer(intent).data)


class MyIntentsView(APIView):
    """List the current student's recent payment intents (any status)."""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        qs = PaymentIntent.objects.filter(student=s).order_by("-created_at")[:50]
        return Response(PaymentIntentSerializer(qs, many=True).data)
