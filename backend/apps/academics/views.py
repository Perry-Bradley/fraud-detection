import logging

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import (
    IsStaffMember, IsStaffOrReadOnly, IsStaffWriteTeacherOrAdmin, IsTeacherOrAdmin,
)
from apps.students.models import Student
from .models import (
    AcademicYear, Term, Subject, SchoolClass, ClassSubject, Assessment, Grade,
)
from .serializers import (
    AcademicYearSerializer, TermSerializer, SubjectSerializer,
    SchoolClassSerializer, ClassSubjectSerializer, AssessmentSerializer,
    GradeSerializer, ReportCardSerializer,
)
from .reportcards import (
    report_card_with_rank, compute_class_rankings, render_report_card_pdf,
    render_report_card_docx,
)

logger = logging.getLogger(__name__)


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsStaffOrReadOnly]


class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.select_related("academic_year").all()
    serializer_class = TermSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("academic_year", "name", "is_current")


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsStaffOrReadOnly]
    search_fields = ("name", "code")
    filterset_fields = ("is_active",)


class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.select_related("class_teacher").all()
    serializer_class = SchoolClassSerializer
    permission_classes = [IsStaffOrReadOnly]
    search_fields = ("name", "level")

    @action(detail=True, methods=["get"], permission_classes=[IsStaffMember])
    def rankings(self, request, pk=None):
        """Ranked report cards for the whole class for a given term."""
        school_class = self.get_object()
        term = get_object_or_404(Term, id=request.query_params.get("term"))
        cards = compute_class_rankings(school_class, term)
        return Response(ReportCardSerializer(cards, many=True).data)


class ClassSubjectViewSet(viewsets.ModelViewSet):
    queryset = ClassSubject.objects.select_related("subject", "teacher", "school_class").all()
    serializer_class = ClassSubjectSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("school_class", "subject", "teacher")


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.select_related("subject", "school_class", "term").all()
    serializer_class = AssessmentSerializer
    permission_classes = [IsStaffWriteTeacherOrAdmin]
    filterset_fields = ("school_class", "subject", "term", "kind")
    search_fields = ("name",)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[IsStaffMember])
    def roster(self, request, pk=None):
        """Return the class roster with each student's current grade for this
        assessment — the data the gradebook entry screen needs. Missing grades
        come back as null so the UI can render an empty input per student.
        """
        assessment = self.get_object()
        students = Student.objects.filter(
            class_name=assessment.school_class.name, is_active=True
        ).order_by("full_name")
        existing = {g.student_id: g for g in assessment.grades.all()}
        rows = []
        for s in students:
            g = existing.get(s.id)
            rows.append({
                "student": str(s.id),
                "matricule": s.matricule,
                "student_name": s.full_name,
                "score": None if g is None else g.score,
                "is_absent": False if g is None else g.is_absent,
                "remark": "" if g is None else g.remark,
            })
        return Response({
            "assessment": AssessmentSerializer(assessment).data,
            "roster": rows,
        })

    @action(detail=True, methods=["post"], permission_classes=[IsTeacherOrAdmin])
    def grades(self, request, pk=None):
        """Bulk upsert grades for this assessment.

        Body: { "grades": [ {student, score, is_absent, remark}, ... ] }
        """
        assessment = self.get_object()
        items = request.data.get("grades", [])
        if not isinstance(items, list):
            return Response({"detail": "grades must be a list"}, status=400)

        saved = 0
        for item in items:
            sid = item.get("student")
            if not sid:
                continue
            score = item.get("score")
            if score in ("", None):
                score = None
            Grade.objects.update_or_create(
                assessment=assessment,
                student_id=sid,
                defaults={
                    "score": score,
                    "is_absent": bool(item.get("is_absent", False)),
                    "remark": item.get("remark", "") or "",
                    "recorded_by": request.user,
                },
            )
            saved += 1
        return Response({"detail": f"{saved} grade(s) saved"}, status=status.HTTP_200_OK)


class ReportCardView(APIView):
    """Computed report card for one student in one term (JSON)."""
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        student = get_object_or_404(Student, id=request.query_params.get("student"))
        term = get_object_or_404(Term, id=request.query_params.get("term"))
        card = report_card_with_rank(student, term)
        return Response(ReportCardSerializer(card).data)


class ReportCardPDFView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        student = get_object_or_404(Student, id=request.query_params.get("student"))
        term = get_object_or_404(Term, id=request.query_params.get("term"))
        pdf = render_report_card_pdf(student, term)
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = (
            f'inline; filename="report-{student.matricule}-{term.name}.pdf"'
        )
        return resp


class ReportCardDOCXView(APIView):
    """Editable Microsoft Word (.docx) report card."""
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request):
        student = get_object_or_404(Student, id=request.query_params.get("student"))
        term = get_object_or_404(Term, id=request.query_params.get("term"))
        docx = render_report_card_docx(student, term)
        resp = HttpResponse(
            docx,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        resp["Content-Disposition"] = (
            f'attachment; filename="report-{student.matricule}-{term.name}.docx"'
        )
        return resp
