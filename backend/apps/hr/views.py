from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffMember, IsStaffOrReadOnly, IsAdmin
from .models import StaffProfile, StaffAttendance, LeaveRequest, SalaryPayment
from .serializers import (
    StaffProfileSerializer, StaffAttendanceSerializer, LeaveRequestSerializer,
    SalaryPaymentSerializer,
)
from .services import disburse_salary


class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.select_related("user").all()
    serializer_class = StaffProfileSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("department", "employment_type", "is_active")
    search_fields = ("staff_id", "full_name", "designation", "department")


class StaffAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.select_related("staff").all()
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsStaffMember]
    filterset_fields = ("staff", "date", "status")

    @action(detail=False, methods=["post"], permission_classes=[IsStaffMember])
    def mark(self, request):
        """Bulk-mark staff attendance for a date.

        Body: {date, records: [{staff, status, check_in?, check_out?, note?}]}
        """
        date = request.data.get("date")
        records = request.data.get("records", [])
        if not date or not isinstance(records, list):
            return Response({"detail": "date and records[] required"}, status=400)
        saved = 0
        for rec in records:
            sid = rec.get("staff")
            if not sid:
                continue
            StaffAttendance.objects.update_or_create(
                staff_id=sid, date=date,
                defaults={
                    "status": rec.get("status", StaffAttendance.Status.PRESENT),
                    "check_in": rec.get("check_in") or None,
                    "check_out": rec.get("check_out") or None,
                    "note": rec.get("note", "") or "",
                    "marked_by": request.user,
                },
            )
            saved += 1
        return Response({"detail": f"{saved} record(s) saved"}, status=status.HTTP_200_OK)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("staff", "reviewed_by").all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsStaffMember]
    filterset_fields = ("staff", "status", "leave_type")

    def _decide(self, request, new_status):
        leave = self.get_object()
        leave.status = new_status
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        return Response(self.get_serializer(leave).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        return self._decide(request, LeaveRequest.Status.APPROVED)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        return self._decide(request, LeaveRequest.Status.REJECTED)


class SalaryPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only disbursement history (any staff member can view)."""
    queryset = SalaryPayment.objects.select_related("staff").all()
    serializer_class = SalaryPaymentSerializer
    permission_classes = [IsStaffMember]
    filterset_fields = ("staff", "status")
    search_fields = ("staff__full_name", "staff__staff_id", "reference", "period")


class DisburseSalaryView(APIView):
    """Admin sends a salary payment to a staff member via mobile money.

    Body: { "staff": <id>, "amount": <number>, "period": "June 2026", "phone": "<optional>" }
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        staff = get_object_or_404(StaffProfile, id=request.data.get("staff"))
        try:
            amount = Decimal(str(request.data.get("amount", "")))
        except (InvalidOperation, TypeError):
            return Response({"detail": "amount must be a number"}, status=400)
        if amount <= 0:
            return Response({"detail": "amount must be greater than 0"}, status=400)

        payment = disburse_salary(
            staff=staff,
            amount=amount,
            period=request.data.get("period", "") or "",
            phone=request.data.get("phone", "") or "",
            actor=request.user,
        )
        body = SalaryPaymentSerializer(payment).data
        ok = payment.status != SalaryPayment.Status.FAILED
        return Response(body, status=status.HTTP_201_CREATED if ok else status.HTTP_400_BAD_REQUEST)
