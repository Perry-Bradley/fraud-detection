from rest_framework.routers import DefaultRouter
from .views import StaffProfileViewSet, StaffAttendanceViewSet, LeaveRequestViewSet

router = DefaultRouter()
router.register("staff", StaffProfileViewSet, basename="staff")
router.register("staff-attendance", StaffAttendanceViewSet, basename="staff-attendance")
router.register("leave-requests", LeaveRequestViewSet, basename="leave-request")

urlpatterns = router.urls
