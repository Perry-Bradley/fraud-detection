from rest_framework.routers import DefaultRouter
from .views import ExamSessionViewSet, ExamScheduleViewSet, ExamResultViewSet

router = DefaultRouter()
router.register("exam-sessions", ExamSessionViewSet, basename="exam-session")
router.register("exam-schedules", ExamScheduleViewSet, basename="exam-schedule")
router.register("exam-results", ExamResultViewSet, basename="exam-result")

urlpatterns = router.urls
