"""Captures login events into the audit log."""
from django.utils.deprecation import MiddlewareMixin


class AuditMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        try:
            path = request.path
            if path.endswith("/api/auth/login/") and request.method == "POST" and 200 <= response.status_code < 300:
                from .models import AuditLog
                AuditLog.objects.create(
                    action="LOGIN",
                    table_name="users",
                    ip_address=self._client_ip(request),
                    new_value={"username": request.POST.get("username") or self._json_username(request)},
                )
        except Exception:
            pass
        return response

    @staticmethod
    def _client_ip(request) -> str:
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")

    @staticmethod
    def _json_username(request) -> str:
        try:
            import json
            return json.loads(request.body or b"{}").get("username", "")
        except Exception:
            return ""
