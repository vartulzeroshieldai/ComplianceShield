from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
# --- ADD OrganizationViewSet TO THIS IMPORT ---
from .views import SignUpView, UserViewSet, RoleViewSet, UserProfileView, OrganizationViewSet, AuditorsViewSet
from .serializers import MyTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
# --- THE FIX IS HERE: Register the new endpoint ---
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'auditors', AuditorsViewSet, basename='auditor')


urlpatterns = [
    path('signup/', SignUpView.as_view(), name='signup'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
]