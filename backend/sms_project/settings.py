"""
Django settings for the School Fees Management System.
"""
from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name: str, default: str | None = None) -> str:
    val = os.environ.get(name, default)
    return val if val is not None else ""


def env_bool(name: str, default: bool = False) -> bool:
    return env(name, str(default)).lower() in ("1", "true", "yes", "on")


SECRET_KEY = env("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = [h.strip() for h in env("DJANGO_ALLOWED_HOSTS", "*").split(",") if h.strip()]

# ---------- Apps ----------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "django_prometheus",
    "drf_spectacular",

    # Local apps
    "apps.accounts",
    "apps.students",
    "apps.fees",
    "apps.payments",
    "apps.audit",
    "apps.analytics",
    "apps.portal",
    "apps.notifications",
    "apps.announcements",
    "apps.academics",
    "apps.attendance",
    "apps.exams",
    "apps.timetable",
    "apps.admissions",
    "apps.hr",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.AuditMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "sms_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "sms_project.wsgi.application"
ASGI_APPLICATION = "sms_project.asgi.application"

# ---------- Database ----------
DATABASES = {
    "default": {
        "ENGINE": "django_prometheus.db.backends.postgresql",
        "NAME": env("DB_NAME", "school_fees"),
        "USER": env("DB_USER", "sms_user"),
        "PASSWORD": env("DB_PASSWORD", "sms_password"),
        "HOST": env("DB_HOST", "postgres"),
        "PORT": env("DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

# Managed hosts (Railway/Render/Heroku) expose a single DATABASE_URL. If present
# it wins over the individual DB_* vars above. We keep the django_prometheus
# engine so DB metrics still flow.
_DATABASE_URL = env("DATABASE_URL", "")
if _DATABASE_URL:
    import dj_database_url
    DATABASES["default"] = dj_database_url.parse(
        _DATABASE_URL, conn_max_age=60, ssl_require=env_bool("DB_SSL_REQUIRE", False)
    )
    DATABASES["default"]["ENGINE"] = "django_prometheus.db.backends.postgresql"

# ---------- Cache (Redis) ----------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", "redis://redis:6379/0"),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

# ---------- Auth ----------
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------- DRF + JWT ----------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": env("JWT_SECRET", SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "School Fees Management API",
    "DESCRIPTION": "Centralized digital fee tracking with anomaly detection.",
    "VERSION": "1.0.0",
}

# ---------- CORS ----------
CORS_ALLOW_ALL_ORIGINS = True  # tighten in production
CORS_ALLOW_CREDENTIALS = True

# ---------- Production / behind-a-proxy (Railway, Render, etc.) ----------
# Comma-separated https origins that may submit forms / use the Django admin,
# e.g. "https://sms-backend.up.railway.app,https://sms.example.com"
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in env("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()
]
# The PaaS terminates TLS and forwards as http; trust its forwarded-proto header
# so request.is_secure() and secure cookies work without redirect loops.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
# Only force-secure cookies when not in DEBUG (so local http still works).
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# ---------- I18N ----------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Douala"
USE_I18N = True
USE_TZ = True

# ---------- Static ----------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ---------- Media (uploaded files, e.g. admission documents) ----------
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------- Celery (background + scheduled tasks) ----------
# Broker/result backend default to the same Redis the cache uses.
CELERY_BROKER_URL = env("CELERY_BROKER_URL", env("REDIS_URL", "redis://redis:6379/0"))
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 120  # hard kill a task after 2 min
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# How long a PaymentIntent may stay pending before we expire it (minutes).
PAYMENT_INTENT_EXPIRY_MINUTES = int(env("PAYMENT_INTENT_EXPIRY_MINUTES", "30"))

# Scheduled tasks (Celery Beat).
CELERY_BEAT_SCHEDULE = {
    "reconcile-pending-payments": {
        "task": "apps.payments.tasks.reconcile_pending_intents",
        "schedule": 60.0,  # every 60 seconds
    },
    "expire-stale-payment-intents": {
        "task": "apps.payments.tasks.expire_stale_intents",
        "schedule": 300.0,  # every 5 minutes
    },
    "reconcile-salary-disbursements": {
        "task": "apps.hr.tasks.reconcile_pending_disbursements",
        "schedule": 60.0,  # every 60 seconds
    },
}

# ---------- External services ----------
ML_SERVICE_URL = env("ML_SERVICE_URL", "http://ml-service:8000")

# ---------- Campay (mobile money) ----------
# Sandbox base: https://demo.campay.net  (production: https://www.campay.net)
# Two ways to authenticate, in priority order:
#   1. CAMPAY_API_KEY  — a permanent app access token from the dashboard.
#   2. CAMPAY_USERNAME + CAMPAY_PASSWORD — app credentials; the client exchanges
#      them at /api/token/ for a short-lived token (cached in Redis).
# If NONE are set we run in stub mode: a PaymentIntent is created but no external
# call is made, and an admin can /api/payments/payment-intents/{id}/simulate/.
CAMPAY_BASE_URL = env("CAMPAY_BASE_URL", "https://demo.campay.net")
CAMPAY_API_KEY = env("CAMPAY_API_KEY", "")
CAMPAY_USERNAME = env("CAMPAY_USERNAME", "")
CAMPAY_PASSWORD = env("CAMPAY_PASSWORD", "")
CAMPAY_WEBHOOK_SECRET = env("CAMPAY_WEBHOOK_SECRET", "")

# ---------- Logging (structured) ----------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}
