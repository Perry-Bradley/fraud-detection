from rest_framework import serializers
from .models import FeeStructure


class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeStructure
        fields = ("id", "class_name", "term", "academic_year", "amount", "description", "created_at")
        read_only_fields = ("id", "created_at")
