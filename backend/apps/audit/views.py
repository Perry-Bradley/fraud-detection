from rest_framework import viewsets, mixins
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.accounts.permissions import IsAdmin


class AuditLogViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = AuditLog.objects.select_related("changed_by").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("action", "table_name", "changed_by")
    search_fields = ("action", "table_name", "record_id")
    ordering_fields = ("timestamp",)
