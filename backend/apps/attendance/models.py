"""Attendance: daily or per-period marking with parent absence alerts."""
import uuid

from django.conf import settings
from django.db import models


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="attendance"
    )
    # class_name mirrors Student.class_name so we can mark a whole class at once.
    class_name = models.CharField(max_length=50, db_index=True)
    date = models.DateField(db_index=True)
    # Blank period = whole-day attendance. Set for per-lesson attendance.
    period = models.CharField(max_length=30, blank=True, default="")
    subject = models.ForeignKey(
        "academics.Subject", on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PRESENT
    )
    note = models.CharField(max_length=200, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    alert_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "date", "period")
        ordering = ("-date", "student")
        indexes = [
            models.Index(fields=("class_name", "date")),
            models.Index(fields=("student", "-date")),
        ]

    def __str__(self) -> str:
        return f"{self.student.matricule} {self.date} {self.status}"
