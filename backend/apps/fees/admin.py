from django.contrib import admin
from .models import FeeStructure


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ("class_name", "term", "academic_year", "amount")
    list_filter = ("class_name", "term", "academic_year")
