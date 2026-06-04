"""Staff & HR: staff records, staff attendance, and leave requests.

A StaffProfile may link to a login User (so teachers can sign in and use the
gradebook/attendance modules) but can also exist standalone for non-teaching
staff who don't need an account.
"""
import uuid

from django.conf import settings
from django.db import models


class StaffProfile(models.Model):
    class Employment(models.TextChoices):
        FULL_TIME = "full_time", "Full-time"
        PART_TIME = "part_time", "Part-time"
        CONTRACT = "contract", "Contract"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="staff_profile",
    )
    staff_id = models.CharField(max_length=30, unique=True, db_index=True)
    full_name = models.CharField(max_length=200)
    designation = models.CharField(max_length=120, blank=True)  # e.g. "Maths Teacher"
    department = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    employment_type = models.CharField(
        max_length=20, choices=Employment.choices, default=Employment.FULL_TIME
    )
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    date_joined = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("full_name",)

    def __str__(self) -> str:
        return f"{self.staff_id} - {self.full_name}"


class StaffAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        ON_LEAVE = "on_leave", "On Leave"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, related_name="attendance"
    )
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        unique_together = ("staff", "date")
        ordering = ("-date",)

    def __str__(self) -> str:
        return f"{self.staff.staff_id} {self.date} {self.status}"


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class LeaveType(models.TextChoices):
        SICK = "sick", "Sick Leave"
        CASUAL = "casual", "Casual Leave"
        ANNUAL = "annual", "Annual Leave"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile, on_delete=models.CASCADE, related_name="leave_requests"
    )
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices, default=LeaveType.CASUAL)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def days(self) -> int:
        return (self.end_date - self.start_date).days + 1

    def __str__(self) -> str:
        return f"{self.staff.full_name} {self.leave_type} ({self.status})"


class SalaryPayment(models.Model):
    """An outbound salary disbursement to a staff member via mobile money."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile, on_delete=models.PROTECT, related_name="salary_payments"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone = models.CharField(max_length=30)
    period = models.CharField(max_length=40, blank=True)  # e.g. "June 2026"
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reference = models.CharField(max_length=100, blank=True, db_index=True)
    operator = models.CharField(max_length=20, blank=True)
    is_stub = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=255, blank=True)
    raw_callback = models.JSONField(null=True, blank=True)
    disbursed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.staff.full_name} {self.amount} ({self.status})"
