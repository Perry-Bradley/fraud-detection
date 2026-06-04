from rest_framework import serializers

from .models import (
    AcademicYear, Term, Subject, SchoolClass, ClassSubject, Assessment, Grade,
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ("id", "name", "start_date", "end_date", "is_current")


class TermSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="__str__", read_only=True)
    academic_year_name = serializers.CharField(source="academic_year.name", read_only=True)

    class Meta:
        model = Term
        fields = (
            "id", "academic_year", "academic_year_name", "name", "label",
            "start_date", "end_date", "is_current",
        )


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "name", "code", "is_active")


class ClassSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)

    class Meta:
        model = ClassSubject
        fields = (
            "id", "school_class", "subject", "subject_name", "subject_code",
            "teacher", "teacher_name", "coefficient",
        )


class SchoolClassSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(read_only=True)
    class_teacher_name = serializers.CharField(source="class_teacher.full_name", read_only=True)

    class Meta:
        model = SchoolClass
        fields = (
            "id", "name", "level", "class_teacher", "class_teacher_name",
            "capacity", "student_count", "created_at",
        )
        read_only_fields = ("id", "created_at")


class AssessmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    class_name = serializers.CharField(source="school_class.name", read_only=True)
    term_label = serializers.CharField(source="term.__str__", read_only=True)
    graded_count = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = (
            "id", "school_class", "class_name", "subject", "subject_name",
            "term", "term_label", "name", "kind", "max_score", "weight",
            "date", "created_by", "created_at", "graded_count",
        )
        read_only_fields = ("id", "created_by", "created_at")

    def get_graded_count(self, obj):
        return obj.grades.exclude(score__isnull=True).count()


class GradeSerializer(serializers.ModelSerializer):
    matricule = serializers.CharField(source="student.matricule", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = Grade
        fields = (
            "id", "assessment", "student", "matricule", "student_name",
            "score", "is_absent", "remark", "percentage", "updated_at",
        )
        read_only_fields = ("id", "updated_at")


# --- Report card (read-only, computed) ---------------------------------------

class SubjectResultSerializer(serializers.Serializer):
    subject_code = serializers.CharField()
    subject_name = serializers.CharField()
    coefficient = serializers.IntegerField()
    average20 = serializers.FloatField(allow_null=True)
    weighted = serializers.FloatField(allow_null=True)
    grade = serializers.CharField()
    teacher = serializers.CharField()


class ReportCardSerializer(serializers.Serializer):
    student_id = serializers.CharField()
    matricule = serializers.CharField()
    full_name = serializers.CharField()
    class_name = serializers.CharField()
    term = serializers.CharField()
    subjects = SubjectResultSerializer(many=True)
    total_coefficient = serializers.IntegerField()
    total_weighted = serializers.FloatField(allow_null=True)
    average20 = serializers.FloatField(allow_null=True)
    grade = serializers.CharField()
    rank = serializers.IntegerField(allow_null=True)
    class_size = serializers.IntegerField(allow_null=True)
