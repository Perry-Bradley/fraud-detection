from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.accounts.permissions import IsStaffMember, IsAdmin
from apps.students.models import Student
from .models import Application, ApplicationDocument
from .serializers import ApplicationSerializer, ApplicationDocumentSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.prefetch_related("documents").select_related("student").all()
    serializer_class = ApplicationSerializer
    filterset_fields = ("status", "desired_class")
    search_fields = ("reference", "applicant_name", "guardian_name", "guardian_phone")

    def get_permissions(self):
        # Anyone may submit an application; everything else is staff-only.
        if self.action == "create":
            return [AllowAny()]
        return [IsStaffMember()]

    @action(detail=True, methods=["post"], permission_classes=[IsStaffMember])
    def decide(self, request, pk=None):
        """Set the admission decision.

        Body: {"status": "admitted"|"waitlisted"|"rejected"|"under_review", "note": ""}
        """
        application = self.get_object()
        new_status = (request.data.get("status") or "").lower()
        allowed = {
            Application.Status.UNDER_REVIEW,
            Application.Status.ADMITTED,
            Application.Status.WAITLISTED,
            Application.Status.REJECTED,
        }
        if new_status not in allowed:
            return Response({"detail": f"status must be one of {sorted(allowed)}"}, status=400)
        application.status = new_status
        application.review_note = request.data.get("note", application.review_note)
        application.reviewed_by = request.user
        application.reviewed_at = timezone.now()
        application.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])
        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def enroll(self, request, pk=None):
        """Turn an admitted application into a real Student record."""
        application = self.get_object()
        if application.student_id:
            return Response({"detail": "already enrolled", "student": str(application.student_id)}, status=400)
        if application.status not in (Application.Status.ADMITTED, Application.Status.WAITLISTED):
            return Response({"detail": "applicant must be admitted before enrolling"}, status=400)

        matricule = request.data.get("matricule") or f"STU-{application.reference[-6:]}"
        student = Student.objects.create(
            matricule=matricule,
            full_name=application.applicant_name,
            class_name=application.desired_class,
            contact_phone=application.guardian_phone,
            contact_email=application.guardian_email,
            guardian_name=application.guardian_name,
        )
        application.student = student
        application.status = Application.Status.ENROLLED
        application.save(update_fields=["student", "status", "updated_at"])
        return Response({
            "detail": "enrolled",
            "student_id": str(student.id),
            "matricule": student.matricule,
        }, status=status.HTTP_201_CREATED)


class ApplicationDocumentViewSet(viewsets.ModelViewSet):
    queryset = ApplicationDocument.objects.all()
    serializer_class = ApplicationDocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        # Applicants may attach documents to their application during apply.
        if self.action in ("create",):
            return [AllowAny()]
        return [IsStaffMember()]
