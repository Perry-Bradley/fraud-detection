"""Exams: sessions, per-subject scheduling (date/time/room/invigilator),
results entry, and automatic ranking + pass/fail.

Distinct from the day-to-day gradebook (apps.academics): this models formal
exam sittings with a timetable and seating, and produces published rankings.
"""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class ExamSession(models.Model):
    """A named exam period, e.g. 'End of Term 2 Examinations'."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    term = models.ForeignKey(
        "academics.Term", on_delete=models.PROTECT, related_name="exam_sessions"
    )
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("20"))
    pass_mark = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("10"))
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return self.name


class ExamSchedule(models.Model):
    """One subject sitting for one class within a session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ExamSession, on_delete=models.CASCADE, related_name="schedules"
    )
    class_name = models.CharField(max_length=50, db_index=True)
    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE)
    date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    room = models.CharField(max_length=50, blank=True)
    invigilator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        unique_together = ("session", "class_name", "subject")
        ordering = ("date", "start_time")

    def __str__(self) -> str:
        return f"{self.subject.code} {self.class_name} @ {self.date}"


class ExamResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    schedule = models.ForeignKey(
        ExamSchedule, on_delete=models.CASCADE, related_name="results"
    )
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="exam_results"
    )
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_absent = models.BooleanField(default=False)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("schedule", "student")
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.student.matricule}: {self.score}"

    @property
    def passed(self):
        if self.score is None:
            return None
        return self.score >= self.schedule.session.pass_mark
