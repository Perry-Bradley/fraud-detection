from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PeriodViewSet, RoomViewSet, TimetableEntryViewSet,
    ClassTimetableView, TeacherTimetableView, GenerateTimetableView,
)

router = DefaultRouter()
router.register("periods", PeriodViewSet, basename="period")
router.register("rooms", RoomViewSet, basename="room")
router.register("timetable-entries", TimetableEntryViewSet, basename="timetable-entry")

urlpatterns = [
    path("timetable/class/", ClassTimetableView.as_view(), name="timetable-class"),
    path("timetable/teacher/", TeacherTimetableView.as_view(), name="timetable-teacher"),
    path("timetable/generate/", GenerateTimetableView.as_view(), name="timetable-generate"),
] + router.urls
