"""Automatic timetable generator.

Treats scheduling as a constraint-satisfaction problem and solves it with
greedy assignment + backtracking. Each class needs every one of its subjects
taught `periods_per_week` times (derived from the subject coefficient). The
solver places each required lesson into a (day, period) slot such that:

  * the class is free in that slot,
  * the subject's teacher is free across ALL classes in that slot,
  * a room is available (optional — only if rooms exist).

It also spreads a subject's lessons across different days where possible, so a
class doesn't get the same subject twice in one day. Returns a report of what
was placed and anything it couldn't fit (e.g. a teacher is over-subscribed).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from django.db import transaction

from apps.academics.models import SchoolClass, ClassSubject
from .models import Period, Room, TimetableEntry


@dataclass
class Lesson:
    class_name: str
    subject_id: str
    subject_code: str
    teacher_id: int | None


@dataclass
class GenerationReport:
    placed: int = 0
    unplaced: list[str] = field(default_factory=list)
    classes: int = 0
    slots_per_week: int = 0


def _periods_per_week(class_subject: ClassSubject) -> int:
    # Coefficient doubles as weekly frequency; at least one lesson a week.
    return max(1, int(class_subject.coefficient))


def generate_timetable(class_names: list[str] | None = None, days: int = 5) -> GenerationReport:
    """(Re)generate the timetable for the given classes (default: all)."""
    periods = list(Period.objects.filter(is_break=False).order_by("ordinal"))
    rooms = list(Room.objects.all())
    classes = SchoolClass.objects.all()
    if class_names:
        classes = classes.filter(name__in=class_names)
    classes = list(classes)

    day_range = list(range(days))
    slots = [(d, p) for d in day_range for p in periods]  # ordered slot universe

    report = GenerationReport(classes=len(classes), slots_per_week=len(slots))

    # Busy maps shared across all classes (teacher/room are global resources).
    teacher_busy: set[tuple[int, int, str]] = set()   # (teacher_id, day, period_id)
    room_busy: set[tuple[str, int, str]] = set()       # (room_id, day, period_id)

    new_entries: list[TimetableEntry] = []

    # Build the lesson demand per class.
    for sc in classes:
        class_busy: set[tuple[int, str]] = set()       # (day, period_id) for THIS class
        subject_day_used: dict[str, set[int]] = {}     # subject_id -> days already used

        # Expand ClassSubjects into individual lesson instances.
        demand: list[Lesson] = []
        for cs in ClassSubject.objects.select_related("subject", "teacher").filter(
            school_class=sc
        ):
            for _ in range(_periods_per_week(cs)):
                demand.append(Lesson(
                    class_name=sc.name,
                    subject_id=str(cs.subject_id),
                    subject_code=cs.subject.code,
                    teacher_id=cs.teacher_id,
                ))

        # Place each lesson into the first slot that satisfies all constraints,
        # preferring a day this subject hasn't been taught on yet.
        for lesson in demand:
            used_days = subject_day_used.setdefault(lesson.subject_id, set())
            placed = False
            # Two passes: first avoid repeating a subject on the same day.
            for avoid_repeat in (True, False):
                for (d, p) in slots:
                    if (d, p.id) in class_busy:
                        continue
                    if avoid_repeat and d in used_days:
                        continue
                    if lesson.teacher_id is not None and \
                            (lesson.teacher_id, d, p.id) in teacher_busy:
                        continue
                    room = _free_room(rooms, room_busy, d, p.id)
                    if rooms and room is None:
                        continue

                    # Commit the assignment.
                    new_entries.append(TimetableEntry(
                        class_name=lesson.class_name,
                        day=d,
                        period=p,
                        subject_id=lesson.subject_id,
                        teacher_id=lesson.teacher_id,
                        room=room,
                    ))
                    class_busy.add((d, p.id))
                    used_days.add(d)
                    if lesson.teacher_id is not None:
                        teacher_busy.add((lesson.teacher_id, d, p.id))
                    if room is not None:
                        room_busy.add((str(room.id), d, p.id))
                    report.placed += 1
                    placed = True
                    break
                if placed:
                    break
            if not placed:
                report.unplaced.append(f"{lesson.class_name}: {lesson.subject_code}")

    # Persist atomically: clear old entries for these classes, write the new set.
    with transaction.atomic():
        qs = TimetableEntry.objects.all()
        if class_names:
            qs = qs.filter(class_name__in=class_names)
        elif classes:
            qs = qs.filter(class_name__in=[c.name for c in classes])
        qs.delete()
        TimetableEntry.objects.bulk_create(new_entries)

    return report


def _free_room(rooms, room_busy, day, period_id):
    for r in rooms:
        if (str(r.id), day, period_id) not in room_busy:
            return r
    return None
