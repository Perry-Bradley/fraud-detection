from django.contrib import admin
from .models import Period, Room, TimetableEntry

admin.site.register(Period)
admin.site.register(Room)
admin.site.register(TimetableEntry)
