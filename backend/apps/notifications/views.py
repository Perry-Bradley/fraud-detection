from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # short list, no need

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)[:50]

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        n = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread": n})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        n = Notification.objects.filter(user=request.user, pk=pk).first()
        if not n:
            return Response({"detail": "not found"}, status=404)
        if not n.is_read:
            n.is_read = True
            n.read_at = timezone.now()
            n.save(update_fields=["is_read", "read_at"])
        return Response({"detail": "ok"})

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now(),
        )
        return Response({"detail": "ok"})
