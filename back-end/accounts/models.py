# GRC/accounts/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db.models.signals import post_save
from django.dispatch import receiver

# --- NEW ORGANIZATION MODEL ---
# This model will now be the single source of truth for organizations.
class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self):
        return self.name

class User(AbstractUser):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending_approval', 'Pending Approval'),
    )
    # --- UPDATED FIELD ---
    # The organization field is now a ForeignKey to the new Organization model.
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text='The organization the user belongs to.'
    )
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_approval')
    groups = models.ManyToManyField(
        Group, verbose_name='groups', blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="custom_user_set", related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        Permission, verbose_name='user permissions', blank=True,
        help_text='Specific permissions for this user.',
        related_name="custom_user_set", related_query_name="user",
    )
    def __str__(self):
        return self.username

class UserSettings(models.Model):
    """
    Stores user-specific settings.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='settings')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)
    weekly_reports = models.BooleanField(default=True)
    compliance_alerts = models.BooleanField(default=True)
    two_factor_auth = models.BooleanField(default=False)
    session_timeout = models.IntegerField(default=30, help_text="Session timeout in minutes")

    def __str__(self):
        return f"Settings for {self.user.username}"

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_settings(sender, instance, created, **kwargs):
    if created:
        UserSettings.objects.create(user=instance)

@receiver(post_save, sender=User)
def handle_user_role_change(sender, instance, **kwargs):
    """
    Signal receiver to manage Auditors entries when a user's role changes.
    This logic is now focused only on the user's role status.
    """
    try:
        auditor_role = Role.objects.get(name='Auditor')
    except Role.DoesNotExist:
        return

    from compliance_monitoring.models import Project

    if instance.role == auditor_role:
        # User has been made an Auditor.
        # We can optionally assign them to unassigned projects here,
        # but the primary logic is now on the Project model's signal.
        # For now, we'll just ensure they are available.
        pass
    else:
        # User is no longer an Auditor. Remove all their assignments.
        # This is safe because it only affects the user who lost the role.
        Auditors.objects.filter(user=instance).delete()


class Auditors(models.Model):
    """
    Represents an auditor assigned to a project.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='auditor_roles')
    project = models.ForeignKey('compliance_monitoring.Project', on_delete=models.CASCADE, related_name='project_auditors')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='auditors')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Auditor Assignment"
        verbose_name_plural = "Auditor Assignments"
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} - {self.project.name}"