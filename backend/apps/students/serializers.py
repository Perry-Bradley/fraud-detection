from rest_framework import serializers
from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    total_due = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            "id",
            "matricule",
            "full_name",
            "class_name",
            "contact_phone",
            "contact_email",
            "guardian_name",
            "enrollment_date",
            "is_active",
            "total_due",
            "total_paid",
            "outstanding",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "enrollment_date", "created_at", "updated_at")

    def get_total_due(self, obj):
        return obj.total_due()

    def get_total_paid(self, obj):
        return obj.total_paid()

    def get_outstanding(self, obj):
        return obj.outstanding()
