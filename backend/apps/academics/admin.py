from django.contrib import admin

from .models import (
    AcademicYear, Term, Subject, SchoolClass, ClassSubject, Assessment, Grade,
)

admin.site.register(AcademicYear)
admin.site.register(Term)
admin.site.register(Subject)
admin.site.register(SchoolClass)
admin.site.register(ClassSubject)
admin.site.register(Assessment)
admin.site.register(Grade)
