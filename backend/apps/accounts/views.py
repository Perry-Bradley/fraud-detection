from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer, UserCreateSerializer
from .permissions import IsAdmin


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsAdmin]
    search_fields = ("username", "email", "full_name")
    filterset_fields = ("role", "is_active")

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"], permission_classes=[])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)
