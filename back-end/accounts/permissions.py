from rest_framework.permissions import BasePermission

# --- The Central Permission Matrix ---
# This dictionary defines all rights for all roles across all apps.
ROLE_PERMISSIONS = {
    'Admin': {
        '*': ['view', 'create', 'edit', 'delete'],
    },
    'Auditor': {
        # --- FIX: Removed permissions for Accounts (User Management) and Questionnaire ---
        # Auditors can now only view these specific modules.
        'ComplianceMonitoring': ['view'],
        'RiskManagement': ['view'],
        # Note: Since there is no entry for 'Accounts' or 'Auditing' (Logs), 
        # they will be denied access by default.
    },
    'Contributor': {
        'Accounts': ['view'],
        'Questionnaire': ['view', 'create', 'edit', 'delete'],
        'ComplianceMonitoring': ['view', 'create'],
        'RiskManagement': ['view', 'create'], 
    }
}

class HasAppPermission(BasePermission):
    """
    A generic permission class that checks if a user's role
    has the required permission for a specific app and action.
    """
    def has_permission(self, request, view):
        # Get the required app name from the ViewSet
        app_name = getattr(view, 'app_name', None)
        if not app_name:
            return False

        # Get the user's role
        user = request.user
        if not user or not user.is_authenticated or not user.role:
            return False
        role_name = user.role.name

        # Map the view's action to our permission names
        action_map = {
            'list': 'view',
            'retrieve': 'view',
            'create': 'create',
            'update': 'edit',
            'partial_update': 'edit',
            'destroy': 'delete',
        }
        required_action = action_map.get(view.action)
        if not required_action:
            return False

        # --- The Core Logic ---
        role_perms = ROLE_PERMISSIONS.get(role_name, {})

        if '*' in role_perms and required_action in role_perms['*']:
            return True

        app_perms = role_perms.get(app_name, [])
        if required_action in app_perms:
            return True

        return False
