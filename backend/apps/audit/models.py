from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    action = models.CharField(max_length=50, db_index=True)
    table_name = models.CharField(max_length=50, blank=True)
    record_id = models.CharField(max_length=100, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-timestamp",)
        indexes = [models.Index(fields=("-timestamp",))]

    def __str__(self) -> str:
        return f"{self.timestamp:%Y-%m-%d %H:%M} {self.action} {self.table_name}"
