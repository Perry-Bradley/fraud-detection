from decimal import Decimal
from django.test import TestCase
from apps.students.models import Student
from apps.payments.models import Payment


class PaymentReceiptTests(TestCase):
    def test_receipt_no_auto_generated(self):
        student = Student.objects.create(
            matricule="TST001", full_name="Test Student", class_name="Form 1"
        )
        p = Payment.objects.create(student=student, amount=Decimal("10000"), method="cash")
        self.assertTrue(p.receipt_no.startswith("RCP-"))
        self.assertEqual(len(p.receipt_no.split("-")), 3)

    def test_unique_receipt_no(self):
        s = Student.objects.create(matricule="TST002", full_name="Other", class_name="Form 2")
        p1 = Payment.objects.create(student=s, amount=Decimal("5000"), method="cash")
        p2 = Payment.objects.create(student=s, amount=Decimal("5000"), method="cash")
        self.assertNotEqual(p1.receipt_no, p2.receipt_no)
