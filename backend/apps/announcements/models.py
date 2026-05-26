from django.conf import settings
from django.db import models


class Announcement(models.Model):
    class Audience(models.TextChoices):
        ALL = "all", "All Students"
        STAFF = "staff", "Staff Only"
        CLASS = "class", "Specific Class"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        URGENT = "urgent", "Urgent"

    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.ALL)
    target_class = models.CharField(max_length=50, blank=True, help_text="Used when audience='class'")
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.INFO)
    is_pinned = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-is_pinned", "-created_at")

    def __str__(self) -> str:
        return self.title
