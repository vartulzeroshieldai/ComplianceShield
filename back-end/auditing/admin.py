#grc/auditing/admin.py
from django.contrib import admin
from .models import Log, Evidence, Risk, AuditorReview, Todo, ActionItem, Comment

# Register your models here.
admin.site.register(Log)
admin.site.register(Evidence)
admin.site.register(Risk)
admin.site.register(AuditorReview)
admin.site.register(Comment)

@admin.register(ActionItem)
class ActionItemAdmin(admin.ModelAdmin):
    """
    Admin interface for ActionItem model.
    """
    list_display = ['title', 'category', 'status', 'priority', 'requester', 'assignee', 'project', 'created_at']
    list_filter = ['category', 'status', 'priority', 'type', 'created_at']
    search_fields = ['title', 'description', 'requester__username', 'assignee__username', 'project__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'type', 'category')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'due_date')
        }),
        ('Assignment', {
            'fields': ('requester', 'assignee', 'project')
        }),
        ('Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """
        Filter ActionItems based on user's organization.
        """
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Filter by user's organization
        if hasattr(request.user, 'organization') and request.user.organization:
            return qs.filter(project__organization=request.user.organization)
        return qs.none()

@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    """
    Admin interface for Todo model with admin-only access.
    """
    list_display = ['title', 'category', 'status', 'priority', 'admin', 'assignee', 'due_date', 'created_at']
    list_filter = ['category', 'status', 'priority', 'admin', 'created_at']
    search_fields = ['title', 'description', 'admin__username', 'assignee__username']
    readonly_fields = ['admin', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'type', 'category')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'due_date')
        }),
        ('Assignment', {
            'fields': ('admin', 'assignee', 'requester', 'project')
        }),
        ('Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """
        Only show todos created by the current admin user.
        """
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(admin=request.user)
    
    def save_model(self, request, obj, form, change):
        """
        Automatically set the admin to the current user.
        """
        if not change:  # Only for new objects
            obj.admin = request.user
        super().save_model(request, obj, form, change)