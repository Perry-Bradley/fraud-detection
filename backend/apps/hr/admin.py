from django.contrib import admin
from .models import StaffProfile, StaffAttendance, LeaveRequest

admin.site.register(StaffProfile)
admin.site.register(StaffAttendance)
admin.site.register(LeaveRequest)
