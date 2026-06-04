from rest_framework import serializers

from .models import StaffProfile, StaffAttendance, LeaveRequest


class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = (
            "id", "user", "staff_id", "full_name", "designation", "department",
            "phone", "email", "employment_type", "salary", "date_joined",
            "is_active", "created_at",
        )
        read_only_fields = ("id", "created_at")


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.full_name", read_only=True)
    staff_code = serializers.CharField(source="staff.staff_id", read_only=True)

    class Meta:
        model = StaffAttendance
        fields = (
            "id", "staff", "staff_name", "staff_code", "date", "status",
            "check_in", "check_out", "note",
        )
        read_only_fields = ("id",)


class LeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.full_name", read_only=True)
    days = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id", "staff", "staff_name", "leave_type", "start_date", "end_date",
            "days", "reason", "status", "status_display", "reviewed_by",
            "reviewed_at", "created_at",
        )
        read_only_fields = ("id", "status", "reviewed_by", "reviewed_at", "created_at")
