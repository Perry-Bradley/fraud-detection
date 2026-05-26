from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        BURSARY = "bursary_staff", "Bursary Staff"
        VIEWER = "viewer", "Viewer"
        STUDENT = "student", "Student"

    full_name = models.CharField(max_length=200, blank=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.VIEWER)
    phone = models.CharField(max_length=30, blank=True)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    @property
    def can_record_payment(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.BURSARY)

    @property
    def is_staff_member(self) -> bool:
        """Anyone who can use the staff dashboard (excludes students)."""
        return self.role in (self.Role.ADMIN, self.Role.BURSARY, self.Role.VIEWER)

    @property
    def is_student(self) -> bool:
        return self.role == self.Role.STUDENT
