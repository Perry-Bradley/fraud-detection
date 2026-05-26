"""Seeds demo data so the system has something to display on first run."""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
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
            num_payments = random.randint(0, 3)
            for _ in range(num_payments):
                Payment.objects.create(
                    student=s,
                    amount=Decimal(random.choice([20000, 30000, 50000, 75000])),
                    method=random.choice(METHODS),
                    reference=f"REF-{random.randint(1000, 9999)}",
                )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {Student.objects.count()} students, "
            f"{FeeStructure.objects.count()} fee structures, "
            f"{Payment.objects.count()} payments."
        ))
