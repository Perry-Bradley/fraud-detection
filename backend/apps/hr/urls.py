from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    StaffProfileViewSet, StaffAttendanceViewSet, LeaveRequestViewSet,
    SalaryPaymentViewSet, DisburseSalaryView,
)

router = DefaultRouter()
router.register("staff", StaffProfileViewSet, basename="staff")
router.register("staff-attendance", StaffAttendanceViewSet, basename="staff-attendance")
router.register("leave-requests", LeaveRequestViewSet, basename="leave-request")
router.register("salary-payments", SalaryPaymentViewSet, basename="salary-payment")

urlpatterns = [
    path("salary-payments/disburse/", DisburseSalaryView.as_view(), name="disburse-salary"),
] + router.urls
