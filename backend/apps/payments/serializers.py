from rest_framework import serializers
from .models import Payment, PaymentIntent


class PaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_matricule = serializers.CharField(source="student.matricule", read_only=True)
    student_class = serializers.CharField(source="student.class_name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "receipt_no",
            "student",
            "student_name",
            "student_matricule",
            "student_class",
            "fee_structure",
            "amount",
            "method",
            "reference",
            "payment_date",
            "recorded_by",
            "recorded_by_name",
            "is_anomalous",
            "anomaly_score",
            "notes",
            "created_at",
        )
        read_only_fields = (
            "id",
            "receipt_no",
            "payment_date",
            "recorded_by",
            "is_anomalous",
            "anomaly_score",
            "created_at",
        )


class PaymentIntentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_matricule = serializers.CharField(source="student.matricule", read_only=True)
    payment_receipt_no = serializers.CharField(source="payment.receipt_no", read_only=True)

    class Meta:
        model = PaymentIntent
        fields = (
            "id",
            "student",
            "student_name",
            "student_matricule",
            "amount",
            "phone",
            "description",
            "status",
            "campay_reference",
            "operator",
            "ussd_code",
            "is_stub",
            "failure_reason",
            "payment",
            "payment_receipt_no",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
