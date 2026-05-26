from rest_framework import viewsets
from .models import FeeStructure
from .serializers import FeeStructureSerializer
from apps.accounts.permissions import IsStaffOrReadOnly


class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsStaffOrReadOnly]
    filterset_fields = ("class_name", "term", "academic_year")
    search_fields = ("class_name", "academic_year")
