from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Announcement
from .serializers import AnnouncementSerializer
from apps.accounts.permissions import IsAdmin
from apps.notifications.models import notify
from apps.accounts.models import User


class AnnouncementViewSet(viewsets.ModelViewSet):
    """Admins create + manage. All authed users can read with audience filtering."""
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ("audience", "severity", "is_pinned")
    search_fields = ("title", "body")

    def get_queryset(self):
        now = timezone.now()
        qs = Announcement.objects.exclude(expires_at__lt=now)

        u = self.request.user
        if u.is_authenticated and u.is_admin:
            return qs  # admins see everything

        # Non-admins see what's targeted to them
        cond = Q(audience=Announcement.Audience.ALL)
        if u.is_staff_member:
            cond |= Q(audience=Announcement.Audience.STAFF)
        if u.is_student and hasattr(u, "student_profile") and u.student_profile:
            cond |= Q(
                audience=Announcement.Audience.CLASS,
                target_class=u.student_profile.class_name,
            )
        return qs.filter(cond)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        ann = serializer.save(created_by=self.request.user)
        # Fan out as in-app notifications to the target audience
        target_users = self._target_users(ann)
        for user in target_users:
            notify(
                user,
                title=f"📢 {ann.title}",
                message=ann.body[:200],
                kind="warning" if ann.severity == "urgent" else "info",
                link="/announcements",
            )

    @staticmethod
    def _target_users(ann):
        if ann.audience == Announcement.Audience.ALL:
            return User.objects.filter(role=User.Role.STUDENT, is_active=True)
        if ann.audience == Announcement.Audience.STAFF:
            return User.objects.filter(is_active=True).exclude(role=User.Role.STUDENT)
        if ann.audience == Announcement.Audience.CLASS and ann.target_class:
            return User.objects.filter(
                role=User.Role.STUDENT,
                is_active=True,
                student_profile__class_name=ann.target_class,
            )
        return User.objects.none()
