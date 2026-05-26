from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.username", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "action",
            "table_name",
            "record_id",
            "changed_by",
            "changed_by_name",
            "old_value",
            "new_value",
            "ip_address",
            "timestamp",
        )
        read_only_fields = fields
