"""Seed demo anomalous payments so the Fraud Detection page has data to show.

Creates a mix of duplicate-amount and outlier-amount anomalies on random
students, with realistic scores, reasons, audit entries and admin notifications.

Idempotent: skips if any anomalous payments already exist.

Run inside the backend container:
    docker compose exec backend python manage.py seed_anomalies
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from django.db.models import Sum

from apps.academics.models import AcademicYear
from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.fees.models import FeeStructure
from apps.notifications.models import notify
from apps.payments.models import Payment
from apps.students.models import Student


# (reason, score, "outlier" | "duplicate")
PROFILES = [
    ("Same-day duplicate transaction", 0.96, "duplicate"),
    ("Duplicate amount detected", 0.93, "duplicate"),
    ("Unusual amount (>3σ from this student's history)", 0.82, "outlier"),
    ("Suspicious payment pattern - rapid successive payments", 0.74, "outlier"),
    ("Amount significantly outside class average", 0.71, "outlier"),
    ("Round-number anomaly - amount inconsistent with prior fees", 0.68, "outlier"),
]

NORMAL_AMOUNTS = [20000, 25000, 30000, 40000, 50000]
# Outlier amounts are intentionally unusual compared to NORMAL_AMOUNTS (2-3× range)
# but not so large they blow out a student's balance vs actual fees.
OUTLIER_AMOUNTS = [85000, 95000, 110000, 125000]


class Command(BaseCommand):
    help = "Seed anomalous payments for the Fraud Detection demo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Add more anomalies even if some already exist.",
        )
        parser.add_argument(
            "--count", type=int, default=5,
            help="How many students to flag (default 5).",
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        existing = Payment.objects.filter(is_anomalous=True).count()
        if existing and not opts["force"]:
            self.stdout.write(self.style.WARNING(
                f"{existing} anomalous payment(s) already exist. "
                f"Use --force to add more.",
            ))
            return

        students = list(Student.objects.filter(is_active=True))
        if not students:
            self.stdout.write(self.style.ERROR("No students found. Run seed_demo first."))
            return

        admins = list(User.objects.filter(role=User.Role.ADMIN, is_active=True))
        targets = random.sample(students, min(opts["count"], len(students)))
        anomaly_count = 0

        for student in targets:
            # Ensure enough history for the anomaly to "feel" like an outlier,
            # but cap history payments so total_paid never exceeds total_due.
            current_year = AcademicYear.objects.filter(is_current=True).first()
            year_name = current_year.name.replace("/", "-") if current_year else "2025-2026"
            total_due = FeeStructure.objects.filter(
                class_name=student.class_name,
                academic_year__in=[current_year.name if current_year else year_name, year_name],
            ).aggregate(t=Sum('amount'))['t'] or Decimal('150000')

            existing_payments = Payment.objects.filter(student=student).count()
            existing_total = Payment.objects.filter(student=student).aggregate(
                t=Sum('amount')
            )['t'] or Decimal('0')

            for _ in range(max(0, 3 - existing_payments)):
                budget = total_due * Decimal('0.5') - existing_total
                if budget <= 10000:
                    break
                amt = Decimal(random.choice([a for a in NORMAL_AMOUNTS if a <= int(budget)]) if any(a <= int(budget) for a in NORMAL_AMOUNTS) else NORMAL_AMOUNTS[0])
                Payment.objects.create(
                    student=student,
                    amount=amt,
                    method=random.choice(["cash", "mobile_money", "bank_transfer"]),
                    reference=f"HIST-{random.randint(1000, 9999)}",
                )
                existing_total += amt

            # 1-2 anomalies per flagged student
            for _ in range(random.randint(1, 2)):
                reason, score, kind = random.choice(PROFILES)

                if kind == "duplicate":
                    last = Payment.objects.filter(student=student).order_by("-payment_date").first()
                    amount = last.amount if last else Decimal("30000")
                else:
                    amount = Decimal(random.choice(OUTLIER_AMOUNTS))

                payment = Payment.objects.create(
                    student=student,
                    amount=amount,
                    method=random.choice(["cash", "mobile_money", "bank_transfer"]),
                    reference=f"FLAG-{random.randint(1000, 9999)}",
                )
                payment.is_anomalous = True
                payment.anomaly_score = Decimal(str(score))
                payment.anomaly_reason = reason
                payment.save(update_fields=["is_anomalous", "anomaly_score", "anomaly_reason"])

                AuditLog.objects.create(
                    action="ANOMALY_DETECTED",
                    table_name="payments",
                    record_id=str(payment.id),
                    new_value={
                        "score": float(score),
                        "reason": reason,
                        "amount": str(amount),
                        "kind": kind,
                    },
                )

                for admin in admins:
                    notify(
                        admin,
                        title="Suspicious payment flagged",
                        message=(
                            f"Receipt {payment.receipt_no} ({amount} FCFA) for "
                            f"{student.full_name}: {reason}"
                        ),
                        kind="danger",
                        link="/staff/anomalies",
                    )
                anomaly_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"✓ Seeded {anomaly_count} anomalous payment(s) across "
            f"{len(targets)} student(s)."
        ))
        self.stdout.write("Open the Fraud Detection page to review them.")
