# GRC/compliance_monitoring/permissions.py
from rest_framework import permissions
from .models import Project, ProjectMember


class IsProjectOwnerOrMember(permissions.BasePermission):
    """
    Custom permission to allow access to project owners and organization members.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to access the project object.
        """
        if not request.user.is_authenticated:
            return False
            
        # If it's a Project object, use the has_access method
        if isinstance(obj, Project):
            return obj.has_access(request.user)
            
        # For other objects, check if they belong to a project the user can access
        if hasattr(obj, 'project'):
            return obj.project.has_access(request.user)
            
        return False


class CanEditProject(permissions.BasePermission):
    """
    Custom permission to allow editing only to project owners and members with edit permissions.
    """
    
    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to edit the project object.
        """
        if not request.user.is_authenticated:
            return False
            
        # If it's a Project object, use the can_edit method
        if isinstance(obj, Project):
            return obj.can_edit(request.user)
            
        # For other objects, check if they belong to a project the user can edit
        if hasattr(obj, 'project'):
            return obj.project.can_edit(request.user)
            
        return False


class IsOrganizationMember(permissions.BasePermission):
    """
    Custom permission to allow access only to users in the same organization.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is authenticated and has an organization.
        """
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'organization') and 
            request.user.organization is not None
        )
    
    def has_object_permission(self, request, view, obj):
        """
        Check if the user belongs to the same organization as the object.
        """
        if not request.user.is_authenticated:
            return False
            
        # If the object has an organization field
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
            
        # If the object has a project field, check the project's organization
        if hasattr(obj, 'project') and hasattr(obj.project, 'organization'):
            return obj.project.organization == request.user.organization
            
        return False
