from rest_framework import serializers

from .models import ExamSession, ExamSchedule, ExamResult


class ExamSessionSerializer(serializers.ModelSerializer):
    term_label = serializers.CharField(source="term.__str__", read_only=True)

    class Meta:
        model = ExamSession
        fields = (
            "id", "name", "term", "term_label", "max_score", "pass_mark",
            "is_published", "created_at",
        )
        read_only_fields = ("id", "created_at")


class ExamScheduleSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    invigilator_name = serializers.CharField(source="invigilator.full_name", read_only=True)

    class Meta:
        model = ExamSchedule
        fields = (
            "id", "session", "class_name", "subject", "subject_name",
            "subject_code", "date", "start_time", "end_time", "room",
            "invigilator", "invigilator_name",
        )


class ExamResultSerializer(serializers.ModelSerializer):
    matricule = serializers.CharField(source="student.matricule", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    passed = serializers.BooleanField(read_only=True)

    class Meta:
        model = ExamResult
        fields = (
            "id", "schedule", "student", "matricule", "student_name",
            "score", "is_absent", "passed", "updated_at",
        )
        read_only_fields = ("id", "passed", "updated_at")
