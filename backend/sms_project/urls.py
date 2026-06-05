from django.conf import settings
from django.conf.urls.static import static
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
    import requests
    from django.conf import settings
    ml_url = settings.ML_SERVICE_URL
    ml_reachable = False
    ml_error = None
    try:
        r = requests.get(f"{ml_url}/health", timeout=2)
        r.raise_for_status()
        ml_reachable = True
    except Exception as e:
        ml_error = str(e)

    return JsonResponse({
        "status": "ok" if ml_reachable else "degraded",
        "ml_service_url": ml_url,
        "ml_service_reachable": ml_reachable,
        "ml_service_error": ml_error,
    })


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
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.announcements.urls")),
    path("api/", include("apps.academics.urls")),
    path("api/", include("apps.attendance.urls")),
    path("api/", include("apps.exams.urls")),
    path("api/", include("apps.timetable.urls")),
    path("api/", include("apps.admissions.urls")),
    path("api/", include("apps.hr.urls")),
]

# Serve uploaded media in development (in production an ingress/CDN handles this).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
