from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Student
from .serializers import StudentSerializer
from apps.accounts.permissions import IsStaffOrReadOnly


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsStaffOrReadOnly]
    search_fields = ("matricule", "full_name", "guardian_name", "contact_email")
    filterset_fields = ("class_name", "is_active")
    ordering_fields = ("full_name", "class_name", "enrollment_date")

    @action(detail=True, methods=["get"])
    def balance(self, request, pk=None):
        s = self.get_object()
        return Response({
            "student_id": str(s.id),
            "matricule": s.matricule,
            "full_name": s.full_name,
            "class_name": s.class_name,
            "total_due": s.total_due(),
            "total_paid": s.total_paid(),
            "outstanding": s.outstanding(),
        })

    @action(detail=True, methods=["get"])
    def payments(self, request, pk=None):
        from apps.payments.models import Payment
        from apps.payments.serializers import PaymentSerializer
        s = self.get_object()
        qs = Payment.objects.filter(student=s).order_by("-payment_date")
        return Response(PaymentSerializer(qs, many=True).data)
