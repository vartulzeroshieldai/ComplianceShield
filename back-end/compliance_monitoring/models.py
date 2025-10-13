# compliance_monitoring/models.py
from django.db import models
from django.conf import settings # Use settings to get the custom user model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Count

# --- IMPORT THE CENTRALIZED ORGANIZATION MODEL ---
from accounts.models import Organization, User, Role, Auditors


class Framework(models.Model):
    """
    Represents a compliance framework, such as ISO 27001 or GDPR.
    This is the top-level model.
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="The name of the compliance framework (e.g., 'ISO 27001:2022')."
    )
    description = models.TextField(
        blank=True,
        help_text="A brief description of the framework."
    )

    class Meta:
        ordering = ['name']
        verbose_name = "Framework"
        verbose_name_plural = "Frameworks"

    def __str__(self):
        return self.name


class Clause(models.Model):
    """
    Represents a main clause within a specific compliance framework.
    Each clause is directly linked to one framework.
    """
    framework = models.ForeignKey(
        Framework,
        on_delete=models.CASCADE,
        related_name='clauses',
        help_text="The framework this clause belongs to."
    )
    clause_number = models.CharField(
        max_length=50,
        help_text="The identifier for the clause (e.g., 'A.5.1')."
    )
    title = models.CharField(
        max_length=255,
        help_text="The title of the clause."
    )
    description = models.TextField(
        blank=True,
        help_text="The detailed description or requirements of the clause."
    )

    class Meta:
        ordering = ['framework', 'clause_number']
        unique_together = ('framework', 'clause_number')
        verbose_name = "Clause"
        verbose_name_plural = "Clauses"

    def __str__(self):
        return f"{self.framework.name} - {self.clause_number}: {self.title}"


class SubClause(models.Model):
    """
    Represents a sub-clause, which is a child of a main clause.
    This provides a more granular level of detail.
    """
    clause = models.ForeignKey(
        Clause,
        on_delete=models.CASCADE,
        related_name='sub_clauses',
        help_text="The parent clause this sub-clause belongs to."
    )
    sub_clause_number = models.CharField(
        max_length=50,
        help_text="The identifier for the sub-clause (e.g., 'a', '1', 'i')."
    )
    title = models.CharField(
        max_length=255,
        help_text="The title of the sub-clause."
    )
    description = models.TextField(
        blank=True,
        help_text="The detailed description or requirements of the sub-clause."
    )

    class Meta:
        ordering = ['clause', 'sub_clause_number']
        unique_together = ('clause', 'sub_clause_number')
        verbose_name = "Sub-Clause"
        verbose_name_plural = "Sub-Clauses"

    def __str__(self):
        return f"{self.clause.clause_number}.{self.sub_clause_number}: {self.title}"

class Project(models.Model):
    """
    Represents a compliance project, which ties together a framework,
    owner, and tracks overall progress.
    """
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('At Risk', 'At Risk'),
    ]

    name = models.CharField(max_length=255, help_text="The name of the project.")
    description = models.TextField(blank=True, help_text="A detailed description of the project.")

    # --- UPDATED ORGANIZATION FIELD ---
    # This now points to the single Organization model in the accounts app.
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE, # If an org is deleted, delete their projects
        related_name='projects',
        help_text="The organization this project belongs to."
    )

    framework = models.ForeignKey(
        Framework,
        on_delete=models.PROTECT,
        related_name='projects',
        help_text="The compliance framework this project is based on."
    )
    owner = models.ForeignKey(
        # Use settings.AUTH_USER_MODEL to refer to your custom User model
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_projects',
        help_text="The user who owns this project."
    )
    auditor_enabled = models.BooleanField(
        default=False,
        help_text="Indicates if auditors are enabled for this project."
    )
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='Not Started',
        help_text="The current status of the project."
    )
    progress = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="The completion percentage of the project (0-100)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name

    def has_access(self, user):
        """
        Check if a user has access to this project.
        Users have access if they are:
        1. The project owner
        2. A member of the same organization
        3. An explicitly added project member
        """
        if not user.is_authenticated:
            return False
        
        # Owner always has access
        if self.owner == user:
            return True
            
        # Organization members have access
        if self.organization and user.organization == self.organization:
            return True
            
        # Explicitly added project members have access
        if self.project_members.filter(user=user).exists():
            return True
            
        return False

    def can_edit(self, user):
        """
        Check if a user can edit this project.
        Users can edit if they are:
        1. The project owner
        2. An explicitly added project member with edit permissions
        """
        if not user.is_authenticated:
            return False
            
        # Owner can always edit
        if self.owner == user:
            return True
            
        # Check if user is an explicitly added member with edit permissions
        member = self.project_members.filter(user=user).first()
        if member and member.can_edit:
            return True
            
        return False


class ProjectMember(models.Model):
    """
    Represents a user who has been explicitly added to a project
    with specific permissions.
    """
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('edit', 'Edit'),
        ('admin', 'Admin'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='project_members',
        help_text="The project this member belongs to."
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='project_memberships',
        help_text="The user who is a member of this project."
    )
    permission_level = models.CharField(
        max_length=10,
        choices=PERMISSION_CHOICES,
        default='view',
        help_text="The permission level for this user on this project."
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_project_members',
        help_text="The user who added this member to the project."
    )
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('project', 'user')
        verbose_name = "Project Member"
        verbose_name_plural = "Project Members"
    
    def __str__(self):
        return f"{self.user.username} - {self.project.name} ({self.permission_level})"
    
    @property
    def can_edit(self):
        """Check if this member can edit the project."""
        return self.permission_level in ['edit', 'admin']
    
    @property
    def can_admin(self):
        """Check if this member can admin the project."""
        return self.permission_level == 'admin'

@receiver(post_save, sender=Project)
def handle_project_auditor_status_change(sender, instance, created, **kwargs):
    """
    Signal to assign or unassign an auditor when a project's auditor_enabled status changes.
    """
    # If a new project is created with auditors enabled, or an existing one is toggled on
    if instance.auditor_enabled and not instance.project_auditors.exists():
        try:
            auditor_role = Role.objects.get(name='Auditor')
            
            # Find the auditor in the same organization with the fewest assigned projects
            available_auditors = User.objects.filter(
                organization=instance.organization,
                role=auditor_role
            ).annotate(
                project_count=Count('auditor_roles')
            ).order_by('project_count')

            if available_auditors.exists():
                auditor_to_assign = available_auditors.first()
                Auditors.objects.create(
                    user=auditor_to_assign,
                    project=instance,
                    organization=instance.organization
                )
        except Role.DoesNotExist:
            return # Do nothing if the Auditor role isn't defined

    # If auditor support is disabled for the project, remove any existing assignments
    elif not instance.auditor_enabled and instance.project_auditors.exists():
        instance.project_auditors.all().delete()


