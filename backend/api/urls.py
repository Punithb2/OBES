from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'students', StudentViewSet)
router.register(r'marks', MarkViewSet)
# New Endpoints
router.register(r'pos', ProgramOutcomeViewSet)
router.register(r'psos', ProgramSpecificOutcomeViewSet)
router.register(r'configurations', ConfigurationViewSet)
router.register(r'articulationMatrix', ArticulationMatrixViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]