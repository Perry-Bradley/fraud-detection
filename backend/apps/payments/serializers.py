from rest_framework import serializers
from .models import Payment, PaymentIntent, ManualPaymentSubmission


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
            "anomaly_reason",
            "review_status",
            "reviewed_by",
            "reviewed_at",
            "review_note",
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
            "anomaly_reason",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        )


class ManualPaymentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_matricule = serializers.CharField(source="student.matricule", read_only=True)
    student_class = serializers.CharField(source="student.class_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.username", read_only=True)
    proof_file_url = serializers.SerializerMethodField()

    class Meta:
        model = ManualPaymentSubmission
        fields = (
            "id",
            "student",
            "student_name",
            "student_matricule",
            "student_class",
            "amount",
            "payment_method",
            "payment_date",
            "proof_file",
            "proof_file_url",
            "notes",
            "status",
            "submitted_at",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "review_note",
            "payment",
        )
        read_only_fields = (
            "id",
            "student",
            "status",
            "submitted_at",
            "reviewed_by",
            "reviewed_at",
            "payment",
        )

    def get_proof_file_url(self, obj):
        request = self.context.get("request")
        if obj.proof_file and request:
            return request.build_absolute_uri(obj.proof_file.url)
        return None


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
