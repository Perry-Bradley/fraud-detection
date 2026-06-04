from rest_framework import serializers

from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    matricule = serializers.CharField(source="student.matricule", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = (
            "id", "student", "matricule", "student_name", "class_name",
            "date", "period", "subject", "status", "note", "alert_sent",
            "created_at",
        )
        read_only_fields = ("id", "alert_sent", "created_at")
