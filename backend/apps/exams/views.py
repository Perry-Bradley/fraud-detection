from collections import defaultdict

from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import (
    IsStaffMember, IsStaffOrReadOnly, IsStaffWriteTeacherOrAdmin, IsTeacherOrAdmin,
)
from apps.students.models import Student
from .models import ExamSession, ExamSchedule, ExamResult
from .serializers import (
    ExamSessionSerializer, ExamScheduleSerializer, ExamResultSerializer,
)


class ExamSessionViewSet(viewsets.ModelViewSet):
    queryset = ExamSession.objects.select_related("term").all()
    serializer_class = ExamSessionSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("term", "is_published")

    @action(detail=True, methods=["get"], permission_classes=[IsStaffMember])
    def rankings(self, request, pk=None):
        """Aggregate every subject result into a ranked class result sheet.

        Query: ?class_name=Form%204
        Returns each student's total, average, pass/fail and position.
        """
        session = self.get_object()
        class_name = request.query_params.get("class_name")
        schedules = session.schedules.all()
        if class_name:
            schedules = schedules.filter(class_name=class_name)

        totals = defaultdict(float)
        counts = defaultdict(int)
        names = {}
        results = ExamResult.objects.filter(
            schedule__in=schedules, score__isnull=False
        ).select_related("student")
        for r in results:
            totals[r.student_id] += float(r.score)
            counts[r.student_id] += 1
            names[r.student_id] = (r.student.matricule, r.student.full_name)

        rows = []
        pass_mark = float(session.pass_mark)
        for sid, total in totals.items():
            n = counts[sid] or 1
            avg = total / n
            matricule, full_name = names[sid]
            rows.append({
                "student": str(sid),
                "matricule": matricule,
                "student_name": full_name,
                "subjects": n,
                "total": round(total, 2),
                "average": round(avg, 2),
                "passed": avg >= pass_mark,
            })
        rows.sort(key=lambda x: x["average"], reverse=True)
        for i, row in enumerate(rows, start=1):
            row["rank"] = i
        return Response({
            "session": session.name,
            "class_name": class_name,
            "pass_mark": pass_mark,
            "results": rows,
        })


class ExamScheduleViewSet(viewsets.ModelViewSet):
    queryset = ExamSchedule.objects.select_related("subject", "invigilator", "session").all()
    serializer_class = ExamScheduleSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("session", "class_name", "subject")

    @action(detail=True, methods=["get"], permission_classes=[IsStaffMember])
    def roster(self, request, pk=None):
        """Class roster with each student's current result for this sitting."""
        schedule = self.get_object()
        students = Student.objects.filter(
            class_name=schedule.class_name, is_active=True
        ).order_by("full_name")
        existing = {r.student_id: r for r in schedule.results.all()}
        rows = []
        for s in students:
            r = existing.get(s.id)
            rows.append({
                "student": str(s.id),
                "matricule": s.matricule,
                "student_name": s.full_name,
                "score": None if r is None else r.score,
                "is_absent": False if r is None else r.is_absent,
            })
        return Response({
            "schedule": ExamScheduleSerializer(schedule).data,
            "roster": rows,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsTeacherOrAdmin])
    def results(self, request, pk=None):
        """Bulk upsert results for this sitting.

        Body: {"results": [{student, score, is_absent}]}
        """
        schedule = self.get_object()
        items = request.data.get("results", [])
        if not isinstance(items, list):
            return Response({"detail": "results must be a list"}, status=400)
        saved = 0
        for item in items:
            sid = item.get("student")
            if not sid:
                continue
            score = item.get("score")
            if score in ("", None):
                score = None
            ExamResult.objects.update_or_create(
                schedule=schedule, student_id=sid,
                defaults={
                    "score": score,
                    "is_absent": bool(item.get("is_absent", False)),
                    "recorded_by": request.user,
                },
            )
            saved += 1
        return Response({"detail": f"{saved} result(s) saved"}, status=status.HTTP_200_OK)


class ExamResultViewSet(viewsets.ModelViewSet):
    queryset = ExamResult.objects.select_related("student", "schedule").all()
    serializer_class = ExamResultSerializer
    permission_classes = [IsStaffWriteTeacherOrAdmin]
    filterset_fields = ("schedule", "student")
