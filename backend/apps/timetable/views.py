from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsStaffMember, IsStaffOrReadOnly, IsAdmin
from .models import Period, Room, TimetableEntry, DAYS
from .serializers import PeriodSerializer, RoomSerializer, TimetableEntrySerializer
from .generator import generate_timetable


class PeriodViewSet(viewsets.ModelViewSet):
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    permission_classes = [IsStaffOrReadOnly]


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsStaffOrReadOnly]


class TimetableEntryViewSet(viewsets.ModelViewSet):
    queryset = TimetableEntry.objects.select_related("subject", "teacher", "room", "period").all()
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("class_name", "teacher", "day", "subject")


def _grid(entries):
    """Shape a flat entry list into {day: {period_ordinal: entry}} for the UI."""
    periods = list(Period.objects.filter(is_break=False).order_by("ordinal"))
    data = TimetableEntrySerializer(entries, many=True).data
    grid: dict = {}
    for d, label in DAYS:
        grid[d] = {"label": label, "slots": {}}
    for e in data:
        grid.setdefault(e["day"], {"label": "", "slots": {}})["slots"][e["period_ordinal"]] = e
    return {
        "periods": PeriodSerializer(periods, many=True).data,
        "days": [{"day": d, "label": l} for d, l in DAYS],
        "grid": grid,
    }


class ClassTimetableView(APIView):
    """Weekly grid for one class. Query: ?class_name=Form%204"""
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        class_name = request.query_params.get("class_name")
        entries = TimetableEntry.objects.select_related(
            "subject", "teacher", "room", "period"
        ).filter(class_name=class_name)
        return Response({"class_name": class_name, **_grid(entries)})


class TeacherTimetableView(APIView):
    """Weekly grid for one teacher. Query: ?teacher=<user_id>"""
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        teacher_id = request.query_params.get("teacher")
        entries = TimetableEntry.objects.select_related(
            "subject", "teacher", "room", "period"
        ).filter(teacher_id=teacher_id)
        return Response({"teacher": teacher_id, **_grid(entries)})


class GenerateTimetableView(APIView):
    """Run the auto-generator. Admin only.

    Body (optional): {"class_names": ["Form 4", ...], "days": 5}
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        class_names = request.data.get("class_names") or None
        days = int(request.data.get("days", 5))
        report = generate_timetable(class_names=class_names, days=days)
        return Response({
            "placed": report.placed,
            "unplaced": report.unplaced,
            "classes": report.classes,
            "slots_per_week": report.slots_per_week,
            "fully_scheduled": len(report.unplaced) == 0,
        })
