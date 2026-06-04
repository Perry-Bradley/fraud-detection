from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncMonth, TruncDay
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.accounts.permissions import IsStaffMember
from apps.payments.models import Payment, PaymentIntent
from apps.students.models import Student


# ============================================================
# Core summary KPIs with deltas vs previous period
# ============================================================
class SummaryView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

        total_collected = Payment.objects.aggregate(s=Sum("amount"))["s"] or 0
        this_month = Payment.objects.filter(payment_date__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
        last_month = Payment.objects.filter(
            payment_date__gte=prev_month_start, payment_date__lt=month_start
        ).aggregate(s=Sum("amount"))["s"] or 0
        delta_pct = (
            float((this_month - last_month) / last_month * 100) if last_month else None
        )

        student_count = Student.objects.filter(is_active=True).count()
        anomaly_count = Payment.objects.filter(is_anomalous=True).count()
        avg_payment = Payment.objects.aggregate(a=Avg("amount"))["a"] or 0

        total_due = Decimal("0")
        total_paid = Decimal("0")
        for s in Student.objects.filter(is_active=True):
            total_due += Decimal(str(s.total_due()))
            total_paid += Decimal(str(s.total_paid()))
        outstanding = total_due - total_paid
        collection_rate = float(total_paid / total_due * 100) if total_due else 0.0

        defaulters_count = sum(
            1 for s in Student.objects.filter(is_active=True) if s.outstanding() > 0
        )

        return Response({
            "total_collected": float(total_collected),
            "this_month": float(this_month),
            "last_month": float(last_month),
            "delta_pct": delta_pct,
            "total_due": float(total_due),
            "total_paid": float(total_paid),
            "outstanding": float(outstanding),
            "collection_rate": round(collection_rate, 1),
            "student_count": student_count,
            "defaulters_count": defaulters_count,
            "anomaly_count": anomaly_count,
            "avg_payment": float(avg_payment),
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
            {"month": r["month"].strftime("%Y-%m"), "total": float(r["total"] or 0), "count": r["count"]}
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
            {"class_name": r["student__class_name"], "total": float(r["total"] or 0), "count": r["count"]}
            for r in rows
        ])


# ============================================================
# Payment method breakdown (for pie / donut)
# ============================================================
class MethodBreakdownView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = (
            Payment.objects.values("method")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        return Response([
            {"method": r["method"], "total": float(r["total"] or 0), "count": r["count"]}
            for r in rows
        ])


# ============================================================
# Top defaulters - students with highest outstanding
# ============================================================
class TopDefaultersView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        rows = []
        for s in Student.objects.filter(is_active=True):
            out = s.outstanding()
            if out > 0:
                rows.append({
                    "id": str(s.id),
                    "matricule": s.matricule,
                    "full_name": s.full_name,
                    "class_name": s.class_name,
                    "outstanding": float(out),
                    "total_due": float(s.total_due()),
                    "total_paid": float(s.total_paid()),
                })
        rows.sort(key=lambda r: r["outstanding"], reverse=True)
        return Response(rows[:limit])


# ============================================================
# Anomaly trend over time (daily counts for last 30 days)
# ============================================================
class AnomalyTrendView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        rows = (
            Payment.objects.filter(payment_date__gte=since, is_anomalous=True)
            .annotate(day=TruncDay("payment_date"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        return Response([
            {"day": r["day"].strftime("%Y-%m-%d"), "count": r["count"]}
            for r in rows
        ])


# ============================================================
# Activity feed - recent events
# ============================================================
class ActivityFeedView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        from apps.audit.models import AuditLog
        rows = list(
            AuditLog.objects.select_related("changed_by").order_by("-timestamp")[:20]
        )
        return Response([
            {
                "id": a.id,
                "action": a.action,
                "table_name": a.table_name,
                "record_id": a.record_id,
                "user": a.changed_by.username if a.changed_by else "system",
                "timestamp": a.timestamp.isoformat(),
                "summary": (a.new_value or {}),
            }
            for a in rows
        ])


# ============================================================
# Recent payments (top 10) for dashboard
# ============================================================
class RecentPaymentsView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        from apps.payments.serializers import PaymentSerializer
        qs = Payment.objects.select_related("student").order_by("-payment_date")[:10]
        return Response(PaymentSerializer(qs, many=True).data)


# ============================================================
# Online payment funnel - intents by status
# ============================================================
class IntentFunnelView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        rows = (
            PaymentIntent.objects.values("status").annotate(count=Count("id")).order_by()
        )
        return Response(list(rows))


# ============================================================
# Anomaly summary - dedicated KPIs for the fraud detection page
# ============================================================
class AnomalySummaryView(APIView):
    permission_classes = [IsStaffMember]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)

        flagged = Payment.objects.filter(is_anomalous=True)
        open_count = flagged.filter(review_status=Payment.ReviewStatus.OPEN).count()
        confirmed_count = flagged.filter(review_status=Payment.ReviewStatus.CONFIRMED).count()
        dismissed_count = flagged.filter(review_status=Payment.ReviewStatus.DISMISSED).count()
        investigating_count = flagged.filter(review_status=Payment.ReviewStatus.INVESTIGATING).count()

        this_week = flagged.filter(payment_date__gte=week_ago).count()
        avg_score = flagged.aggregate(a=Avg("anomaly_score"))["a"] or 0
        total_flagged_amount = flagged.aggregate(s=Sum("amount"))["s"] or 0
        confirmed_amount = flagged.filter(
            review_status=Payment.ReviewStatus.CONFIRMED
        ).aggregate(s=Sum("amount"))["s"] or 0

        # Most common reasons
        reasons = (
            flagged.exclude(anomaly_reason="")
            .values("anomaly_reason")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Top flagged students (most repeated anomalies)
        top_flagged = (
            flagged.values("student__id", "student__matricule", "student__full_name", "student__class_name")
            .annotate(count=Count("id"), total=Sum("amount"))
            .order_by("-count")[:5]
        )

        return Response({
            "total_flagged": flagged.count(),
            "open": open_count,
            "confirmed": confirmed_count,
            "dismissed": dismissed_count,
            "investigating": investigating_count,
            "this_week": this_week,
            "avg_score": round(float(avg_score), 3),
            "total_flagged_amount": float(total_flagged_amount),
            "confirmed_fraud_amount": float(confirmed_amount),
            "top_reasons": list(reasons),
            "top_flagged_students": [
                {
                    "id": str(r["student__id"]),
                    "matricule": r["student__matricule"],
                    "full_name": r["student__full_name"],
                    "class_name": r["student__class_name"],
                    "count": r["count"],
                    "total": float(r["total"] or 0),
                }
                for r in top_flagged
            ],
        })
