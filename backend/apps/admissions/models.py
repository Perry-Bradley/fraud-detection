"""Admissions: public online applications + an admit/enroll workflow.

A prospective family submits an Application (no account needed). Staff review
it, decide (admit / waitlist / reject), and on admission the application is
*enrolled* — which creates a real Student record and links the two.
"""
import uuid

from django.conf import settings
from django.db import models


class Application(models.Model):
    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        ADMITTED = "admitted", "Admitted"
        WAITLISTED = "waitlisted", "Waitlisted"
        REJECTED = "rejected", "Rejected"
        ENROLLED = "enrolled", "Enrolled"

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=30, unique=True, db_index=True, blank=True)

    applicant_name = models.CharField(max_length=200)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True)
    desired_class = models.CharField(max_length=50)
    previous_school = models.CharField(max_length=200, blank=True)

    guardian_name = models.CharField(max_length=200)
    guardian_phone = models.CharField(max_length=30)
    guardian_email = models.EmailField(blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED, db_index=True
    )
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Set when the application is enrolled into a real Student record.
    student = models.OneToOneField(
        "students.Student", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="application",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"APP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.reference} - {self.applicant_name} ({self.status})"


class ApplicationDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name="documents"
    )
    name = models.CharField(max_length=120)
    file = models.FileField(upload_to="admissions/%Y/%m/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.application.reference})"
