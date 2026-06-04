from rest_framework import serializers

from .models import Application, ApplicationDocument


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationDocument
        fields = ("id", "application", "name", "file", "uploaded_at")
        read_only_fields = ("id", "uploaded_at")


class ApplicationSerializer(serializers.ModelSerializer):
    documents = ApplicationDocumentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Application
        fields = (
            "id", "reference", "applicant_name", "date_of_birth", "gender",
            "desired_class", "previous_school", "guardian_name", "guardian_phone",
            "guardian_email", "status", "status_display", "review_note",
            "reviewed_by", "reviewed_at", "student", "documents",
            "created_at", "updated_at",
        )
        # The public can only set the application facts; status/review are staff-controlled.
        read_only_fields = (
            "id", "reference", "status", "review_note", "reviewed_by",
            "reviewed_at", "student", "created_at", "updated_at",
        )
