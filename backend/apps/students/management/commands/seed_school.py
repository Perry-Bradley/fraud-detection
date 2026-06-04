"""Populate the WHOLE system with demo data across every module.

Builds on seed_demo (students/fees/payments) and seed_anomalies (flagged
payments), then fills in the academic platform: subjects, classes, teachers,
class-subject assignments, periods/rooms, an auto-generated timetable,
assessments + grades (report cards), an exam session with results, attendance,
admissions, staff/HR and payroll disbursements.

Idempotent: skips the academic build if Subjects already exist (use --force to
rebuild). Safe to run on every deploy.

Run:  python manage.py seed_school   [--force]
"""
import random
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.students.models import Student
from apps.academics.models import (
    AcademicYear, Term, Subject, SchoolClass, ClassSubject, Assessment, Grade,
)
from apps.attendance.models import Attendance
from apps.exams.models import ExamSession, ExamSchedule, ExamResult
from apps.timetable.models import Period, Room
from apps.timetable.generator import generate_timetable
from apps.admissions.models import Application
from apps.hr.models import StaffProfile, SalaryPayment

CLASSES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"]

# code, name, coefficient (coef doubles as periods/week for the timetable)
SUBJECTS = [
    ("MATH", "Mathematics", 4),
    ("ENG", "English Language", 3),
    ("FRE", "French", 2),
    ("PHY", "Physics", 4),
    ("CHE", "Chemistry", 3),
    ("BIO", "Biology", 3),
    ("HIST", "History", 2),
]

TEACHERS = [
    "Mr. Tanyi Joseph", "Mrs. Eyong Beatrice", "Mr. Achu Daniel", "Ms. Ngassa Pauline",
    "Mr. Fombi Eric", "Mrs. Akum Vivian", "Mr. Ndip Samuel", "Ms. Bih Carine",
]
NON_TEACHING = [
    ("Bursar", "Mrs. Mengne Rose"), ("Secretary", "Ms. Tani Gladys"),
    ("Librarian", "Mr. Sone Felix"), ("Lab Technician", "Mr. Ako Martin"),
]
EXTRA_STUDENTS = [
    "Ayuk Brandon", "Njoya Fadimatou", "Tchoua Kevin", "Ebai Glory", "Mballa Yves",
    "Sama Princess", "Ngu Derrick", "Foncha Belinda", "Asong Clovis", "Ndifor Pearl",
    "Tabe Wilson", "Mbella Grace", "Kpassword Ivan", "Anye Rita", "Toh Emmanuel",
    "Besong Vanessa", "Ngwa Collins", "Etonde Joan", "Mukete Bryan", "Ashu Lydia",
    "Tassang Boris", "Ndoh Sandra", "Ojong Cedric", "Mesumbe Tina", "Ndam Alfred",
    "Bate Sharon", "Nkwenti Felix", "Eposi Diane", "Tiku Ralph", "Manka Joy",
    "Fon Desmond", "Ngassa Bridget", "Akoh Trevor", "Limen Carine", "Tarh Brian",
    "Enow Vivian", "Ndive Patrick", "Sona Mabel", "Tameh Gerald", "Epie Christabel",
]
APPLICANTS = [
    "Arrey Junior", "Ndifor Blessing", "Mokom Steve", "Eyenga Carole", "Bakume Ronald",
    "Tunde Sophie", "Ngeh Marvin", "Atemkeng Diane",
]
PERIODS = [
    (1, "08:00", "08:55"), (2, "09:00", "09:55"), (3, "10:00", "10:55"),
    (4, "11:00", "11:55"), (5, "12:30", "13:25"), (6, "13:30", "14:25"),
]


def _t(s):
    h, m = s.split(":")
    return time(int(h), int(m))


class Command(BaseCommand):
    help = "Populate the full system with demo data across all modules."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Rebuild even if data exists.")

    @transaction.atomic
    def handle(self, *args, **opts):
        force = opts["force"]
        if Subject.objects.exists() and not force:
            self.stdout.write(self.style.WARNING("Academic data already present, skipping (use --force)."))
            return

        # Base students/fees/payments (idempotent; skips if students exist).
        call_command("seed_demo")

        self.stdout.write("Academic year & terms...")
        year, _ = AcademicYear.objects.get_or_create(
            name="2025/2026",
            defaults={"is_current": True, "start_date": date(2025, 9, 1), "end_date": date(2026, 7, 15)},
        )
        terms = {}
        for name in ["term_1", "term_2", "term_3"]:
            t, _ = Term.objects.get_or_create(
                academic_year=year, name=name, defaults={"is_current": name == "term_1"}
            )
            terms[name] = t
        current_term = terms["term_1"]

        self.stdout.write("Subjects...")
        subjects = {}
        for code, name, coef in SUBJECTS:
            s, _ = Subject.objects.get_or_create(code=code, defaults={"name": name})
            subjects[code] = (s, coef)

        self.stdout.write("Teachers & staff...")
        teachers = []
        for i, fullname in enumerate(TEACHERS, start=1):
            username = f"teacher{i}"
            u, created = User.objects.get_or_create(
                username=username,
                defaults={"full_name": fullname, "role": User.Role.TEACHER, "email": f"{username}@school.com"},
            )
            if created:
                u.set_password("teacher")
                u.save()
            StaffProfile.objects.get_or_create(
                staff_id=f"STF-T{i:02d}",
                defaults={
                    "user": u, "full_name": fullname, "designation": "Teacher",
                    "department": "Academics", "phone": f"6{random.randint(70000000, 99999999)}",
                    "salary": Decimal(random.choice([120000, 150000, 180000, 200000])),
                    "date_joined": date(2022, 9, 1),
                },
            )
            teachers.append(u)
        for i, (desig, fullname) in enumerate(NON_TEACHING, start=1):
            StaffProfile.objects.get_or_create(
                staff_id=f"STF-N{i:02d}",
                defaults={
                    "full_name": fullname, "designation": desig, "department": "Administration",
                    "phone": f"6{random.randint(70000000, 99999999)}",
                    "salary": Decimal(random.choice([90000, 110000, 130000])),
                    "date_joined": date(2023, 1, 10),
                },
            )

        self.stdout.write("Classes & enrolment...")
        classes = {}
        for i, cname in enumerate(CLASSES):
            sc, _ = SchoolClass.objects.get_or_create(
                name=cname, defaults={"level": cname, "class_teacher": teachers[i % len(teachers)], "capacity": 40},
            )
            classes[cname] = sc
        # Make sure each class has a healthy roster.
        for ci, cname in enumerate(CLASSES):
            have = Student.objects.filter(class_name=cname, is_active=True).count()
            for n in range(max(0, 8 - have)):
                matricule = f"CT25{ci + 1}{n + 1:02d}"
                if Student.objects.filter(matricule=matricule).exists():
                    continue
                name = EXTRA_STUDENTS[(ci * 8 + n) % len(EXTRA_STUDENTS)]
                Student.objects.create(
                    matricule=matricule, full_name=name, class_name=cname,
                    contact_phone=f"6{random.randint(70000000, 99999999)}",
                    guardian_name=f"Guardian of {name}",
                )

        self.stdout.write("Class-subject assignments...")
        for cname, sc in classes.items():
            for j, (code, (subj, coef)) in enumerate(subjects.items()):
                ClassSubject.objects.get_or_create(
                    school_class=sc, subject=subj,
                    defaults={"teacher": teachers[j % len(teachers)], "coefficient": coef},
                )

        self.stdout.write("Periods & rooms...")
        for ordinal, start, end in PERIODS:
            Period.objects.get_or_create(
                ordinal=ordinal,
                defaults={"label": f"Period {ordinal}", "start_time": _t(start), "end_time": _t(end)},
            )
        for r in ["Room A", "Room B", "Room C", "Room D", "Lab 1", "Lab 2"]:
            Room.objects.get_or_create(name=r, defaults={"capacity": 40})

        self.stdout.write("Generating timetable...")
        report = generate_timetable()
        self.stdout.write(f"  placed {report.placed} lessons, {len(report.unplaced)} unplaced.")

        self.stdout.write("Assessments & grades...")
        for cname, sc in classes.items():
            students = list(Student.objects.filter(class_name=cname, is_active=True))
            for cs in ClassSubject.objects.filter(school_class=sc):
                for seq in ["Sequence 1", "Sequence 2"]:
                    a, _ = Assessment.objects.get_or_create(
                        school_class=sc, subject=cs.subject, term=current_term, name=seq,
                        defaults={"kind": "ca", "max_score": Decimal("20"), "weight": Decimal("1"), "date": date(2025, 10, 15)},
                    )
                    for st in students:
                        Grade.objects.get_or_create(
                            assessment=a, student=st,
                            defaults={"score": Decimal(str(round(random.uniform(6, 19), 1)))},
                        )

        self.stdout.write("Exam session & results...")
        session, _ = ExamSession.objects.get_or_create(
            name="First Term Examination", term=current_term,
            defaults={"max_score": Decimal("20"), "pass_mark": Decimal("10"), "is_published": True},
        )
        for cname, sc in classes.items():
            students = list(Student.objects.filter(class_name=cname, is_active=True))
            for cs in ClassSubject.objects.filter(school_class=sc):
                sch, _ = ExamSchedule.objects.get_or_create(
                    session=session, class_name=cname, subject=cs.subject,
                    defaults={"date": date(2025, 12, 5), "room": "Room A"},
                )
                for st in students:
                    ExamResult.objects.get_or_create(
                        schedule=sch, student=st,
                        defaults={"score": Decimal(str(round(random.uniform(5, 20), 1)))},
                    )

        self.stdout.write("Attendance (recent days)...")
        today = timezone.now().date()
        for cname, sc in classes.items():
            students = list(Student.objects.filter(class_name=cname, is_active=True))
            for d in range(7):
                day = today - timedelta(days=d)
                if day.weekday() >= 5:
                    continue
                for st in students:
                    status = "present" if random.random() > 0.12 else random.choice(["absent", "late"])
                    Attendance.objects.get_or_create(
                        student=st, date=day, period="",
                        defaults={"class_name": cname, "status": status},
                    )

        self.stdout.write("Admissions...")
        app_statuses = ["submitted", "under_review", "admitted", "waitlisted", "rejected", "submitted", "admitted", "under_review"]
        for i, name in enumerate(APPLICANTS):
            Application.objects.get_or_create(
                applicant_name=name,
                defaults={
                    "desired_class": random.choice(CLASSES), "guardian_name": f"Parent of {name}",
                    "guardian_phone": f"6{random.randint(70000000, 99999999)}",
                    "status": app_statuses[i % len(app_statuses)], "previous_school": "Government School",
                },
            )

        self.stdout.write("Payroll disbursements...")
        for sp in StaffProfile.objects.all()[:6]:
            SalaryPayment.objects.get_or_create(
                staff=sp, period="May 2026",
                defaults={
                    "amount": sp.salary or Decimal("120000"), "phone": sp.phone,
                    "status": SalaryPayment.Status.SUCCESSFUL, "is_stub": True,
                    "reference": f"SAL-{random.randint(100000, 999999)}",
                },
            )

        self.stdout.write("Flagged payments...")
        call_command("seed_anomalies")

        self.stdout.write(self.style.SUCCESS(
            "Full system seeded: subjects, classes, teachers, timetable, grades, "
            "exams, attendance, admissions, staff, payroll and flagged payments."
        ))
