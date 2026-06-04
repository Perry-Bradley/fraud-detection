from django.contrib import admin
from .models import ExamSession, ExamSchedule, ExamResult

admin.site.register(ExamSession)
admin.site.register(ExamSchedule)
admin.site.register(ExamResult)
