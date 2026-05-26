from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("receipt_no", "student", "amount", "method", "payment_date", "is_anomalous")
    list_filter = ("method", "is_anomalous", "payment_date")
    search_fields = ("receipt_no", "student__full_name", "student__matricule")
    readonly_fields = ("receipt_no", "payment_date", "anomaly_score")
