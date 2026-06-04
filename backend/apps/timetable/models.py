"""Timetable: period structure, rooms, and class/teacher schedule entries.

The auto-generator (generator.py) fills TimetableEntry rows subject to three
hard constraints, enforced both in the solver and at the database level:
  * a class can't be in two places in the same slot,
  * a teacher can't teach two classes in the same slot,
  * a room can't host two classes in the same slot.
"""
import uuid

from django.conf import settings
from django.db import models

DAYS = [
    (0, "Monday"),
    (1, "Tuesday"),
    (2, "Wednesday"),
    (3, "Thursday"),
    (4, "Friday"),
    (5, "Saturday"),
]


class Period(models.Model):
    """A slot in the daily schedule, e.g. period 1 = 08:00–08:55."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ordinal = models.PositiveSmallIntegerField(unique=True)
    label = models.CharField(max_length=40, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_break = models.BooleanField(default=False)  # break/lunch — not scheduled

    class Meta:
        ordering = ("ordinal",)

    def __str__(self) -> str:
        return self.label or f"Period {self.ordinal}"


class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    capacity = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class TimetableEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_name = models.CharField(max_length=50, db_index=True)
    day = models.PositiveSmallIntegerField(choices=DAYS)
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="entries")
    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="timetable_entries",
    )
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ("class_name", "day", "period")
        constraints = [
            models.UniqueConstraint(
                fields=["class_name", "day", "period"], name="uq_class_slot"
            ),
            models.UniqueConstraint(
                fields=["teacher", "day", "period"],
                condition=models.Q(teacher__isnull=False),
                name="uq_teacher_slot",
            ),
            models.UniqueConstraint(
                fields=["room", "day", "period"],
                condition=models.Q(room__isnull=False),
                name="uq_room_slot",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.class_name} D{self.day} P{self.period.ordinal}: {self.subject.code}"
