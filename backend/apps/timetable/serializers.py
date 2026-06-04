from rest_framework import serializers

from .models import Period, Room, TimetableEntry


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ("id", "ordinal", "label", "start_time", "end_time", "is_break")


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ("id", "name", "capacity")


class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)
    period_ordinal = serializers.IntegerField(source="period.ordinal", read_only=True)
    day_label = serializers.CharField(source="get_day_display", read_only=True)

    class Meta:
        model = TimetableEntry
        fields = (
            "id", "class_name", "day", "day_label", "period", "period_ordinal",
            "subject", "subject_code", "subject_name", "teacher", "teacher_name",
            "room", "room_name",
        )
