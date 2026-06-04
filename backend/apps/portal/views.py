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
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.accounts.permissions import IsStudent
from apps.payments.models import Payment, PaymentIntent
from apps.payments.receipts import render_receipt_pdf
from apps.payments.serializers import PaymentSerializer, PaymentIntentSerializer
from apps.payments.campay import initiate_collect
from apps.students.models import Student
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


# ---------------------------------------------------------------------------
# Academic self-service: the student's own class, subjects, timetable, results.
# These mirror the staff/admin endpoints but are scoped to request.user's
# student profile, so a student only ever sees their own data.
# ---------------------------------------------------------------------------

class MyClassView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        from apps.academics.models import SchoolClass
        sc = (
            SchoolClass.objects.select_related("class_teacher")
            .filter(name=s.class_name)
            .first()
        )
        return Response({
            "class_name": s.class_name,
            "level": sc.level if sc else "",
            "class_teacher": getattr(getattr(sc, "class_teacher", None), "full_name", "") if sc else "",
            "classmates": Student.objects.filter(class_name=s.class_name, is_active=True).count(),
        })


class MySubjectsView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        from apps.academics.models import SchoolClass, ClassSubject
        sc = SchoolClass.objects.filter(name=s.class_name).first()
        if not sc:
            return Response([])
        rows = [
            {
                "subject": cs.subject.name,
                "code": cs.subject.code,
                "teacher": getattr(cs.teacher, "full_name", "") or "—",
                "coefficient": cs.coefficient,
            }
            for cs in ClassSubject.objects.select_related("subject", "teacher").filter(school_class=sc)
        ]
        return Response(rows)


class MyTimetableView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        from apps.timetable.models import TimetableEntry
        from apps.timetable.views import _grid
        entries = TimetableEntry.objects.select_related(
            "subject", "teacher", "room", "period"
        ).filter(class_name=s.class_name)
        return Response({"class_name": s.class_name, **_grid(entries)})


class MyResultsView(APIView):
    """The student's report card for a term + any published exam results."""
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        s = _get_my_student(request)
        from apps.academics.models import Term
        from apps.academics.reportcards import report_card_with_rank
        from apps.academics.serializers import ReportCardSerializer
        from apps.exams.models import ExamResult

        term_id = request.query_params.get("term")
        term = None
        if term_id:
            term = Term.objects.filter(id=term_id).first()
        if term is None:
            term = (
                Term.objects.filter(is_current=True).first()
                or Term.objects.order_by("-academic_year__name", "-name").first()
            )

        report = None
        if term is not None:
            report = ReportCardSerializer(report_card_with_rank(s, term)).data

        exams = [
            {
                "session": r.schedule.session.name,
                "subject": r.schedule.subject.name,
                "score": r.score,
                "passed": r.passed,
            }
            for r in ExamResult.objects.select_related(
                "schedule__subject", "schedule__session"
            ).filter(student=s, schedule__session__is_published=True)
        ]

        return Response({
            "term": {"id": str(term.id), "label": str(term)} if term else None,
            "terms": [{"id": str(t.id), "label": str(t)} for t in Term.objects.all()],
            "report_card": report,
            "exam_results": exams,
        })


class SignupView(APIView):
    """Public student self-registration.

    Creates a Student (the post_save signal auto-provisions a User), sets the
    chosen password, and returns JWT tokens so the new student is logged in
    immediately.
    """
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        from django.db import transaction
        from rest_framework_simplejwt.tokens import RefreshToken
        from apps.accounts.models import User

        data = request.data or {}
        full_name = (data.get("full_name") or "").strip()
        matricule = (data.get("matricule") or "").strip()
        class_name = (data.get("class_name") or "").strip()
        email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        password = data.get("password") or ""

        if not (full_name and matricule and class_name):
            return Response({"detail": "full_name, matricule and class_name are required"}, status=400)
        if len(password) < 6:
            return Response({"detail": "password must be at least 6 characters"}, status=400)
        if Student.objects.filter(matricule=matricule).exists() or User.objects.filter(username=matricule).exists():
            return Response({"detail": "An account with this matricule already exists"}, status=400)

        with transaction.atomic():
            student = Student.objects.create(
                matricule=matricule,
                full_name=full_name,
                class_name=class_name,
                contact_email=email,
                contact_phone=phone,
            )
            user = student.user  # provisioned by the post_save signal
            if user is None:
                user = User.objects.create_user(
                    username=matricule, password=password, full_name=full_name,
                    email=email, role=User.Role.STUDENT,
                )
                student.user = user
                student.save(update_fields=["user"])
            user.set_password(password)
            if email:
                user.email = email
            user.save(update_fields=["password", "email"])

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "role": user.role,
        }, status=status.HTTP_201_CREATED)
