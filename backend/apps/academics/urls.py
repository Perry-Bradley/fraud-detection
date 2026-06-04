from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AcademicYearViewSet, TermViewSet, SubjectViewSet, SchoolClassViewSet,
    ClassSubjectViewSet, AssessmentViewSet, ReportCardView, ReportCardPDFView,
    ReportCardDOCXView,
)

router = DefaultRouter()
router.register("academic-years", AcademicYearViewSet, basename="academic-year")
router.register("terms", TermViewSet, basename="term")
router.register("subjects", SubjectViewSet, basename="subject")
router.register("classes", SchoolClassViewSet, basename="school-class")
router.register("class-subjects", ClassSubjectViewSet, basename="class-subject")
router.register("assessments", AssessmentViewSet, basename="assessment")

urlpatterns = [
    path("academics/report-card/", ReportCardView.as_view(), name="report-card"),
    path("academics/report-card/pdf/", ReportCardPDFView.as_view(), name="report-card-pdf"),
    path("academics/report-card/docx/", ReportCardDOCXView.as_view(), name="report-card-docx"),
] + router.urls
