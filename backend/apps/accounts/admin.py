from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "full_name", "role", "is_active")
    list_filter = ("role", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("full_name", "role", "phone")}),
    )
