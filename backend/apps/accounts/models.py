from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        BURSARY = "bursary_staff", "Bursary Staff"
        TEACHER = "teacher", "Teacher"
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
        return self.role in (
            self.Role.ADMIN,
            self.Role.BURSARY,
            self.Role.TEACHER,
            self.Role.VIEWER,
        )

    @property
    def is_teacher(self) -> bool:
        return self.role == self.Role.TEACHER

    @property
    def can_grade(self) -> bool:
        """Teachers and admins may enter grades / mark attendance."""
        return self.role in (self.Role.ADMIN, self.Role.TEACHER)

    @property
    def is_student(self) -> bool:
        return self.role == self.Role.STUDENT
