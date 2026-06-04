import logging

from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffMember, IsTeacherOrAdmin
from apps.students.models import Student
from .models import Attendance
from .serializers import AttendanceSerializer
from .services import send_absence_alert

logger = logging.getLogger(__name__)

_ABSENT_STATES = {Attendance.Status.ABSENT, Attendance.Status.LATE}


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("student").all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsStaffMember]
    filterset_fields = ("student", "class_name", "date", "status", "period")
    ordering_fields = ("date",)

    @action(detail=False, methods=["get"])
    def roster(self, request):
        """Marking sheet for a class on a date.

        Query: ?class_name=Form%204&date=2026-06-03&period=
        Returns each active student with their existing status (default Present).
        """
        class_name = request.query_params.get("class_name")
        date = request.query_params.get("date")
        period = request.query_params.get("period", "")
        if not class_name or not date:
            return Response({"detail": "class_name and date are required"}, status=400)

        students = Student.objects.filter(
            class_name=class_name, is_active=True
        ).order_by("full_name")
        existing = {
            a.student_id: a
            for a in Attendance.objects.filter(
                class_name=class_name, date=date, period=period
            )
        }
        rows = []
        for s in students:
            a = existing.get(s.id)
            rows.append({
                "student": str(s.id),
                "matricule": s.matricule,
                "student_name": s.full_name,
                "status": a.status if a else Attendance.Status.PRESENT,
                "note": a.note if a else "",
            })
        return Response({"class_name": class_name, "date": date, "period": period, "roster": rows})

    @action(detail=False, methods=["post"], permission_classes=[IsTeacherOrAdmin])
    def mark(self, request):
        """Bulk-mark a class for a date and fire absence alerts.

        Body: {class_name, date, period?, records: [{student, status, note}]}
        """
        class_name = request.data.get("class_name")
        date = request.data.get("date")
        period = request.data.get("period", "")
        records = request.data.get("records", [])
        if not class_name or not date or not isinstance(records, list):
            return Response({"detail": "class_name, date and records[] required"}, status=400)

        marked = 0
        alerts = 0
        for rec in records:
            sid = rec.get("student")
            if not sid:
                continue
            st = rec.get("status", Attendance.Status.PRESENT)
            obj, _ = Attendance.objects.update_or_create(
                student_id=sid, date=date, period=period,
                defaults={
                    "class_name": class_name,
                    "status": st,
                    "note": rec.get("note", "") or "",
                    "marked_by": request.user,
                },
            )
            marked += 1
            if st in _ABSENT_STATES and not obj.alert_sent:
                send_absence_alert(obj)
                alerts += 1

        return Response(
            {"detail": f"{marked} marked, {alerts} alert(s) sent"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Attendance rate per student (optionally filtered by class)."""
        qs = Attendance.objects.all()
        class_name = request.query_params.get("class_name")
        if class_name:
            qs = qs.filter(class_name=class_name)
        agg = (
            qs.values("student__matricule", "student__full_name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status=Attendance.Status.PRESENT)),
                absent=Count("id", filter=Q(status=Attendance.Status.ABSENT)),
                late=Count("id", filter=Q(status=Attendance.Status.LATE)),
            )
            .order_by("student__full_name")
        )
        out = []
        for r in agg:
            total = r["total"] or 1
            out.append({
                "matricule": r["student__matricule"],
                "student_name": r["student__full_name"],
                "total": r["total"],
                "present": r["present"],
                "absent": r["absent"],
                "late": r["late"],
                "rate": round(r["present"] / total * 100, 1),
            })
        return Response(out)
