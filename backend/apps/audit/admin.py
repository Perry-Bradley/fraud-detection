from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "action", "table_name", "record_id", "changed_by")
    list_filter = ("action", "table_name")
    search_fields = ("action", "table_name", "record_id")
    readonly_fields = [f.name for f in AuditLog._meta.fields]
