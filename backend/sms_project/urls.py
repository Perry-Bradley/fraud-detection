from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),

    # Health + metrics
    path("health/", health, name="health"),
    path("", include("django_prometheus.urls")),

    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Auth
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # App APIs
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.students.urls")),
    path("api/", include("apps.fees.urls")),
    path("api/", include("apps.payments.urls")),
    path("api/", include("apps.audit.urls")),
    path("api/", include("apps.analytics.urls")),
    path("api/", include("apps.portal.urls")),
]
