# GRC/accounts/views.py
from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from .permissions import HasAppPermission
from rest_framework.response import Response
from .serializers import (
    SignUpSerializer, 
    UserAdminSerializer, 
    UserCreateUpdateSerializer, 
    RoleSerializer,
    UserProfileSerializer,
    OrganizationSerializer  # --- ADD THIS IMPORT ---
)
# --- ADD Organization TO THIS IMPORT ---
from .models import Role, User, Organization, Auditors

# Get the custom User model
User = get_user_model()

class SignUpView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = SignUpSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    permission_classes = [HasAppPermission]
    app_name = 'Accounts'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserAdminSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().order_by('id')
    permission_classes = [HasAppPermission]
    app_name = 'Accounts'
    serializer_class = RoleSerializer

# --- ADD THIS ENTIRE VIEWSET ---
class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint to view organizations.
    """
    queryset = Organization.objects.all().order_by('name')
    permission_classes = [IsAuthenticated] # Any authenticated user can see the list of orgs
    serializer_class = OrganizationSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class AuditorsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint to view auditors by organization.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Return auditors from the same organization as the requesting user.
        """
        user = self.request.user
        if user.is_authenticated and user.organization:
            # Get users with Auditor role from the same organization
            auditor_role = Role.objects.filter(name='Auditor').first()
            if auditor_role:
                return User.objects.filter(
                    organization=user.organization,
                    role=auditor_role
                )
        return User.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        List auditors from the same organization.
        """
        auditors = self.get_queryset()
        auditors_data = []
        
        for auditor in auditors:
            auditors_data.append({
                'id': auditor.id,
                'name': auditor.get_full_name() or auditor.username,
                'username': auditor.username,
                'email': auditor.email,
                'organization': auditor.organization.name if auditor.organization else 'Unknown',
                'role': auditor.role.name if auditor.role else 'Member',
            })
        
        return Response(auditors_data)