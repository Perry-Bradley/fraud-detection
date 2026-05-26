from datetime import timedelta
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsStaffMember
from apps.payments.models import Payment
from apps.students.models import Student


class SummaryView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        total_collected = Payment.objects.aggregate(s=Sum("amount"))["s"] or 0
        student_count = Student.objects.filter(is_active=True).count()
        anomaly_count = Payment.objects.filter(is_anomalous=True).count()

        # Outstanding totals (sum of (due-paid) over active students)
        total_due = 0
        total_paid = 0
        for s in Student.objects.filter(is_active=True):
            total_due += s.total_due()
            total_paid += s.total_paid()
        outstanding = total_due - total_paid

        return Response({
            "total_collected": float(total_collected),
            "total_due": float(total_due),
            "total_paid": float(total_paid),
            "outstanding": float(outstanding),
            "student_count": student_count,
            "anomaly_count": anomaly_count,
        })


class PaymentTrendsView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        since = timezone.now() - timedelta(days=365)
        rows = (
            Payment.objects.filter(payment_date__gte=since)
            .annotate(month=TruncMonth("payment_date"))
            .values("month")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("month")
        )
        return Response([
            {"month": r["month"].strftime("%Y-%m"), "total": float(r["total"]), "count": r["count"]}
            for r in rows
        ])


class ClassBreakdownView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = (
            Payment.objects.values("student__class_name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        return Response([
            {"class_name": r["student__class_name"], "total": float(r["total"]), "count": r["count"]}
            for r in rows
        ])
