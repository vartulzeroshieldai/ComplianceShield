# compliance_monitoring/admin.py

from django.contrib import admin
from .models import Framework, Clause, SubClause,Project

class SubClauseInline(admin.TabularInline):
    """
    Allows editing of SubClauses directly within the Clause admin page.
    This makes managing the hierarchy much more intuitive.
    """
    model = SubClause
    extra = 1  # Show one empty form for adding a new sub-clause by default.
    fields = ('id', 'sub_clause_number', 'title', 'description')


@admin.register(Clause)
class ClauseAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Clause model.
    Includes an inline editor for its related SubClauses.
    """
    list_display = ('clause_number', 'title', 'framework', 'description')
    list_filter = ('framework',)
    search_fields = ('clause_number', 'title', 'description')
    inlines = [SubClauseInline] # Embed the SubClause editor here.
    list_per_page = 20


class ClauseInline(admin.TabularInline):
    """
    Allows editing of Clauses directly within the Framework admin page.
    """
    model = Clause
    extra = 1
    fields = ('id', 'clause_number', 'title', 'description')
    show_change_link = True # Adds a link to edit the full Clause object.


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Framework model.
    Includes an inline editor for its related Clauses.
    """
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)
    inlines = [ClauseInline] # Embed the Clause editor here.

@admin.register(SubClause)
class SubClauseAdmin(admin.ModelAdmin):
    """
    Admin configuration for the SubClause model.
    Provides a separate admin page for managing sub-clauses directly.
    """
    list_display = ('sub_clause_number', 'title', 'clause', 'framework_name')
    list_filter = ('clause__framework', 'clause')
    search_fields = ('sub_clause_number', 'title', 'description', 'clause__clause_number')
    list_per_page = 25
    
    def framework_name(self, obj):
        """Display the framework name for easier identification."""
        return obj.clause.framework.name
    framework_name.short_description = 'Framework'
    framework_name.admin_order_field = 'clause__framework__name'

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Project model.
    """
    list_display = ('id', 'name', 'description', 'created_at', 'updated_at')
    search_fields = ('name', 'description')
    list_filter = ('created_at', 'updated_at')