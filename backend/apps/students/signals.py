"""When a Student is created without a linked User, provision one automatically.

Username = matricule, default password = matricule (students should change on
first login). Role is set to STUDENT so DRF permissions route them to the
portal-only endpoints.
"""
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Student


@receiver(post_save, sender=Student)
def ensure_student_user(sender, instance: Student, created: bool, **kwargs):
    if not created or instance.user_id:
        return

    User = get_user_model()
    username = instance.matricule
    if User.objects.filter(username=username).exists():
        return

    user = User.objects.create_user(
        username=username,
        password=username,  # default = matricule, change-on-first-login
        email=instance.contact_email or "",
        full_name=instance.full_name,
        role=User.Role.STUDENT,
    )
    # Avoid recursion: update_fields tells post_save we only touched user_id.
    instance.user = user
    instance.save(update_fields=["user"])
