import uuid
from django.conf import settings
from django.db import models


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
    )
    matricule = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    class_name = models.CharField(max_length=50, db_index=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    guardian_name = models.CharField(max_length=200, blank=True)
    enrollment_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("class_name", "full_name")
        indexes = [
            models.Index(fields=("matricule",)),
            models.Index(fields=("class_name",)),
        ]

    def __str__(self) -> str:
        return f"{self.matricule} - {self.full_name}"

    def total_paid(self):
        from apps.payments.models import Payment
        return Payment.objects.filter(student=self).aggregate(s=models.Sum("amount"))["s"] or 0

    def total_due(self):
        from apps.fees.models import FeeStructure
        return FeeStructure.objects.filter(class_name=self.class_name).aggregate(s=models.Sum("amount"))["s"] or 0

    def outstanding(self):
        return self.total_due() - self.total_paid()
