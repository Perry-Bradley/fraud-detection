"""Seeds demo data so the system has something to display on first run."""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from apps.students.models import Student
from apps.fees.models import FeeStructure
from apps.payments.models import Payment


CLASSES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"]
TERMS = ["term_1", "term_2", "term_3"]
ACADEMIC_YEAR = "2025-2026"
METHODS = ["cash", "bank_transfer", "mobile_money", "cheque"]

DEMO_NAMES = [
    "Sepo Dinga", "Ngwe Immanuel", "Mbah Linda", "Tabi Edward", "Ekambi Sarah",
    "Nkeng Joseph", "Atangana Marie", "Fombi Daniel", "Mvogo Esther", "Bongwong Peter",
    "Ngwene Julie", "Tchakounte Paul", "Manga Aline", "Nfor Brian", "Wanki Cecile",
]


class Command(BaseCommand):
    help = "Seed the database with demo students, fees, and payments."

    @transaction.atomic
    def handle(self, *args, **options):
        if Student.objects.exists():
            self.stdout.write(self.style.WARNING("Demo data already present, skipping."))
            return

        self.stdout.write("Seeding fee structures...")
        for class_name in CLASSES:
            base = 50000 + 10000 * CLASSES.index(class_name)
            for term in TERMS:
                FeeStructure.objects.get_or_create(
                    class_name=class_name,
                    term=term,
                    academic_year=ACADEMIC_YEAR,
                    defaults={"amount": Decimal(base), "description": f"{class_name} {term} fees"},
                )

        self.stdout.write("Seeding students (User accounts auto-created via signal)...")
        students = []
        for i, name in enumerate(DEMO_NAMES, start=1):
            # post_save signal in apps.students.signals creates a User
            # with username=matricule, password=matricule, role=student.
            s = Student.objects.create(
                matricule=f"CT24A{100 + i:03d}",
                full_name=name,
                class_name=random.choice(CLASSES),
                contact_phone=f"+2376{random.randint(10000000, 99999999)}",
                guardian_name=f"Guardian of {name}",
            )
            students.append(s)

        self.stdout.write("Seeding payments...")
        for s in students:
            # Calculate actual fees for this student's class so we never overpay
            total_due = FeeStructure.objects.filter(
                class_name=s.class_name, academic_year=ACADEMIC_YEAR
            ).aggregate(t=Sum('amount'))['t'] or Decimal('0')

            # Seed 0-2 partial payments that together don't exceed total_due
            remaining = total_due
            for _ in range(random.randint(0, 2)):
                if remaining <= 0:
                    break
                # Pay a random partial installment (25-60% of what's still owed)
                pct = Decimal(str(round(random.uniform(0.25, 0.60), 2)))
                chunk = min((total_due * pct).quantize(Decimal('1000')), remaining)
                if chunk <= 0:
                    break
                Payment.objects.create(
                    student=s,
                    amount=chunk,
                    method=random.choice(METHODS),
                    reference=f"REF-{random.randint(1000, 9999)}",
                )
                remaining -= chunk

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Student.objects.count()} students, "
            f"{FeeStructure.objects.count()} fee structures, "
            f"{Payment.objects.count()} payments."
        ))
