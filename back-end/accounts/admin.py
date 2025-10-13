from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group 
from .models import User, Role,Organization,Auditors

class CustomUserAdmin(UserAdmin):
    """
    Configuration for the custom User model in the Django admin.
    This is simplified to use 'role' instead of 'groups'.
    """
    # Define the fields to be displayed in the list view
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'organization', 'role')
    
    # Add filters for custom fields
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'role', 'organization')

    # --- THE FIX IS HERE ---
    # We must redefine fieldsets completely because the default UserAdmin
    # expects a 'groups' and 'user_permissions' field, which we have removed.
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Custom Profile', {'fields': ('organization', 'role')}),
        # Note: 'groups' and 'user_permissions' are removed from this section
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser',)}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # Redefine add_fieldsets as well
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'organization', 'role', 'password', 'password2'),
        }),
    )
    
    # This is also crucial: Override filter_horizontal to be empty
    # because we removed the 'groups' and 'user_permissions' fields.
    filter_horizontal = ()

# Unregister the original Group model from the admin panel to avoid confusion
admin.site.unregister(Group)

# Register your custom models. Now only these will appear.
admin.site.register(User, CustomUserAdmin)
admin.site.register(Role)
admin.site.register(Organization)
admin.site.register(Auditors)