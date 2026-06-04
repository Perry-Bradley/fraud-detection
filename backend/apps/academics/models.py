"""Academic foundation + gradebook.

This app turns the system from a fees tracker into a school platform. It owns
the shared academic structure (years, terms, subjects, classes, teaching
assignments) that Attendance, Exams, Timetable, etc. all build on, plus the
gradebook itself (assessments, grades) and report-card generation.

Design note: ``Student.class_name`` and ``FeeStructure.class_name`` are free
strings already in use. To stay backwards-compatible we mirror that: a
``SchoolClass.name`` is expected to equal those strings, so we can link the new
academic world to existing students without a destructive migration.
"""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class AcademicYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, unique=True)  # e.g. "2025/2026"
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ("-name",)

    def __str__(self) -> str:
        return self.name


class Term(models.Model):
    class Name(models.TextChoices):
        TERM_1 = "term_1", "Term 1"
        TERM_2 = "term_2", "Term 2"
        TERM_3 = "term_3", "Term 3"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name="terms"
    )
    name = models.CharField(max_length=20, choices=Name.choices)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        unique_together = ("academic_year", "name")
        ordering = ("academic_year", "name")

    def __str__(self) -> str:
        return f"{self.get_name_display()} {self.academic_year.name}"


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)  # e.g. "MATH"
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SchoolClass(models.Model):
    """A class/form, e.g. 'Form 4 Science'. ``name`` mirrors Student.class_name."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    level = models.CharField(max_length=50, blank=True)  # e.g. "Form 4"
    class_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classes_led",
    )
    capacity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "School classes"

    def __str__(self) -> str:
        return self.name

    def students(self):
        from apps.students.models import Student
        return Student.objects.filter(class_name=self.name, is_active=True)

    @property
    def student_count(self) -> int:
        return self.students().count()


class ClassSubject(models.Model):
    """A subject taught to a class by a teacher, with a coefficient (weight)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(
        SchoolClass, on_delete=models.CASCADE, related_name="class_subjects"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="class_subjects"
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teaching",
    )
    coefficient = models.PositiveSmallIntegerField(default=1)

    class Meta:
        unique_together = ("school_class", "subject")
        ordering = ("school_class", "subject")

    def __str__(self) -> str:
        return f"{self.subject.code} @ {self.school_class.name} (coef {self.coefficient})"


class Assessment(models.Model):
    """A gradeable event: a CA test, quiz, assignment or exam for a class+subject."""

    class Kind(models.TextChoices):
        CA = "ca", "Continuous Assessment"
        QUIZ = "quiz", "Quiz"
        ASSIGNMENT = "assignment", "Assignment"
        EXAM = "exam", "Exam"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey(
        SchoolClass, on_delete=models.CASCADE, related_name="assessments"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="assessments"
    )
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name="assessments")
    name = models.CharField(max_length=100)  # e.g. "Sequence 1"
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CA)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("20"))
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("1"))
    date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date", "-created_at")
        indexes = [
            models.Index(fields=("school_class", "subject", "term")),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.subject.code} ({self.school_class.name})"


class Grade(models.Model):
    """One student's score on one assessment. ``score`` null = not yet entered."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="grades"
    )
    student = models.ForeignKey(
        "students.Student", on_delete=models.CASCADE, related_name="grades"
    )
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_absent = models.BooleanField(default=False)
    remark = models.CharField(max_length=200, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("assessment", "student")
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.student.matricule}: {self.score}/{self.assessment.max_score}"

    @property
    def percentage(self):
        if self.score is None or not self.assessment.max_score:
            return None
        return float(self.score) / float(self.assessment.max_score) * 100
