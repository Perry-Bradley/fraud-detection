from rest_framework.permissions import BasePermission, SAFE_METHODS


def _is_authed(request):
    return bool(request.user and request.user.is_authenticated)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _is_authed(request) and request.user.is_admin


class IsBursaryOrAdmin(BasePermission):
    """Can record payments. Excludes students and viewers."""
    def has_permission(self, request, view):
        return _is_authed(request) and request.user.can_record_payment


class IsStaffMember(BasePermission):
    """Anyone on the staff side: admin, bursary, viewer. Excludes students."""
    def has_permission(self, request, view):
        return _is_authed(request) and request.user.is_staff_member


class IsStaffOrReadOnly(BasePermission):
    """Read for any staff member, write for admin only. Students blocked outright."""
    def has_permission(self, request, view):
        if not _is_authed(request):
            return False
        if not request.user.is_staff_member:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_admin


class IsTeacherOrAdmin(BasePermission):
    """Can enter grades and mark attendance: teachers and admins."""
    def has_permission(self, request, view):
        return _is_authed(request) and request.user.can_grade


class IsStaffWriteTeacherOrAdmin(BasePermission):
    """Read for any staff member; write for teachers + admins."""
    def has_permission(self, request, view):
        if not _is_authed(request) or not request.user.is_staff_member:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.can_grade


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return _is_authed(request) and request.user.is_student
