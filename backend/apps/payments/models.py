import uuid
from django.conf import settings
from django.db import models
from apps.students.models import Student
from apps.fees.models import FeeStructure


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank_transfer", "Bank Transfer"
        MOBILE = "mobile_money", "Mobile Money"
        CHEQUE = "cheque", "Cheque"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_no = models.CharField(max_length=40, unique=True, db_index=True)
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="payments")
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=30, choices=Method.choices)
    reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    is_anomalous = models.BooleanField(default=False)
    anomaly_score = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)
    anomaly_reason = models.CharField(max_length=200, blank=True, default="")

    # Anomaly review workflow
    class ReviewStatus(models.TextChoices):
        OPEN = "open", "Open (Awaiting Review)"
        CONFIRMED = "confirmed", "Confirmed Fraud"
        DISMISSED = "dismissed", "Dismissed (False Positive)"
        INVESTIGATING = "investigating", "Under Investigation"

    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.OPEN,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_payments",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, default="")

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-payment_date",)
        indexes = [
            models.Index(fields=("-payment_date",)),
            models.Index(fields=("student", "-payment_date")),
        ]

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            self.receipt_no = self._generate_receipt_no()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_receipt_no() -> str:
        from django.utils import timezone
        ts = timezone.now().strftime("%Y%m%d%H%M%S")
        return f"RCP-{ts}-{uuid.uuid4().hex[:6].upper()}"

    def __str__(self) -> str:
        return f"{self.receipt_no} - {self.student.full_name} - {self.amount}"


class PaymentIntent(models.Model):
    """In-flight Campay collection. Promoted to a Payment on webhook success."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="payment_intents")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone = models.CharField(max_length=30)
    description = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    campay_reference = models.CharField(max_length=100, blank=True, db_index=True)
    operator = models.CharField(max_length=20, blank=True)
    ussd_code = models.CharField(max_length=40, blank=True)
    is_stub = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=255, blank=True)
    payment = models.OneToOneField(
        "Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="origin_intent",
    )
    raw_callback = models.JSONField(null=True, blank=True)
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    @property
    def external_reference(self) -> str:
        """We give Campay our own UUID as external_reference to correlate webhooks."""
        return str(self.id)

    def __str__(self) -> str:
        return f"Intent {self.id} ({self.status}) - {self.student.full_name} {self.amount}"
