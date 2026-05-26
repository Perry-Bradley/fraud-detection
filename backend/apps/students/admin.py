from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("matricule", "full_name", "class_name", "is_active", "enrollment_date")
    list_filter = ("class_name", "is_active")
    search_fields = ("matricule", "full_name", "guardian_name")
