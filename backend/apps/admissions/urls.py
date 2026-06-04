from rest_framework.routers import DefaultRouter
from .views import ApplicationViewSet, ApplicationDocumentViewSet

router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="application")
router.register("application-documents", ApplicationDocumentViewSet, basename="application-document")

urlpatterns = router.urls
