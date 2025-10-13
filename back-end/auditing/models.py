#grc/auditing/models.py
from django.db import models
from django.conf import settings
from compliance_monitoring.models import Clause,SubClause,Project
from accounts.models import User
from compliance_monitoring.models import Project

class Log(models.Model):
    """
    Model to store user actions and system events.
    """
    LEVEL_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="The user who performed the action. Can be null for system actions."
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='info')
    action = models.CharField(max_length=255, help_text="A short description of the action, e.g., 'User logged in'.")
    module = models.CharField(max_length=100, help_text="The application module where the action occurred, e.g., 'Authentication'.")
    details = models.TextField(blank=True, help_text="Detailed information about the event, e.g., IP address, object ID.")

    def __str__(self):
        user_str = self.user.username if self.user else 'system'
        return f"{self.timestamp} - {user_str} - {self.action}"

    class Meta:
        ordering = ['-timestamp']

class Evidence(models.Model):
    """
    Model to store evidence files related to auditing events.
    """
    # Approval status choices
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    evidence_name = models.CharField(max_length=255, help_text="A descriptive name for the evidence file.")
    description = models.TextField(blank=True, help_text="Additional details about the evidence.")
    evidence_content = models.TextField(blank=True, help_text="The content of the evidence file.")
     # This allows a single piece of evidence to be linked to many clauses.
    clauses = models.ManyToManyField(
        Clause, 
        related_name='evidences', 
        blank=True, # Allows evidence to exist without being mapped to any clause
        help_text="The clauses this evidence is associated with."
    )
    sub_clause = models.ForeignKey(
        SubClause, 
        on_delete=models.SET_NULL, 
        related_name='evidences', 
        null=True, 
        blank=True,
        help_text="The sub-clause this evidence is associated with."
    )
    file = models.FileField(upload_to='evidence_files/', blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_evidences',
        help_text="The user who created this evidence."
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='evidences', help_text="The project this evidence is associated with.")
    
    # Approval-related fields
    approval_status = models.CharField(
        max_length=20, 
        choices=APPROVAL_STATUS_CHOICES, 
        default='pending',
        help_text="The approval status of this evidence."
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_evidences',
        help_text="The user who approved this evidence."
    )
    approved_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When this evidence was approved."
    )
    approval_notes = models.TextField(
        blank=True,
        help_text="Notes from the approver about the approval decision."
    )

    def __str__(self):
        return f"Evidence '{self.evidence_name}' uploaded at {self.uploaded_at}"

    def save(self, *args, **kwargs):
        """
        Override save to automatically create ActionItem for evidence approval.
        """
        is_new = self.pk is None  # Check if this is a new evidence
        print(f"🔍 DEBUG: Evidence.save() called for evidence {self.evidence_name}, is_new={is_new}, approval_status={self.approval_status}")

        super().save(*args, **kwargs)

        # Only create ActionItem for new evidence that needs approval
        if is_new and self.approval_status == 'pending':
            print(f"🔍 DEBUG: Creating ActionItem for new evidence {self.id}")
            self._create_evidence_approval_action_item()

    def _create_evidence_approval_action_item(self):
        """
        Create an ActionItem for evidence approval.
        """
        try:
            # Check if ActionItem already exists for this evidence
            existing_action_item = ActionItem.objects.filter(
                project=self.project,
                category=ActionItem.Category.EVIDENCE_APPROVAL,
                details__evidence_id=self.id
            ).first()

            if existing_action_item:
                print(f"🔍 DEBUG: ActionItem already exists for evidence {self.id}")
                return

            print(f"🔍 DEBUG: Creating ActionItem for evidence {self.id}, project {self.project.id}")

            # Create ActionItem for evidence approval
            action_item = ActionItem.objects.create(
                project=self.project,
                requester=self.created_by,
                title=f"Approve Evidence: {self.evidence_name}",
                description=f"Evidence '{self.evidence_name}' requires approval. Please review and approve or reject this evidence.",
                type="Evidence Management",
                priority=ActionItem.Priority.MEDIUM,
                status=ActionItem.Status.REQUIRED,
                category=ActionItem.Category.EVIDENCE_APPROVAL,
                details={
                    'evidence_id': self.id,
                    'evidence_name': self.evidence_name,
                    'project_id': self.project.id,
                    'project_name': self.project.name,
                    'creator_name': self.created_by.get_full_name() if self.created_by else 'System User',
                    'created_at': self.uploaded_at.isoformat(),
                    'file_name': self.file.name.split('/')[-1] if self.file else None,
                    'file_size': self.file.size if self.file else None,
                    'file_url': f"http://127.0.0.1:8000{self.file.url}" if self.file else None,
                }
            )

            print(f"🔍 DEBUG: ActionItem created successfully! ID: {action_item.id}")

            # Log the ActionItem creation
            if self.created_by:
                Log.objects.create(
                    user=self.created_by,
                    action=f"Created evidence approval ActionItem: {action_item.title}",
                    module="Evidence Management",
                    level="info",
                    details=f"Evidence ID: {self.id}, ActionItem ID: {action_item.id}"
                )

        except Exception as e:
            print(f"❌ ERROR: Failed to create ActionItem for evidence {self.id}: {str(e)}")

    class Meta:
        ordering = ['-uploaded_at']

# class ProjectJourney(models.Model):
#     """
#     Model to track the audit journey of a project.
#     """
#     members = models.IntegerField(
#         help_text="The number of users who are members of this project's audit journey."
#     )
#     add_policey = models.IntegerField(
#         help_text="The number of policies added in this project's audit journey."
#     )
#     evidence_collected = models.IntegerField(
#         help_text="The number of evidence files collected in this project's audit journey."
#     )
#     risk_registered = models.IntegerField(
#         help_text="The number of risks registered in this project's audit journey."
#     )

class Risk(models.Model):
    """
    Model to store risks associated with projects.
    """
    RISK_CATEGORY_CHOICES = [
        ('Compliance', 'Compliance'),
        ('Security', 'Security'),
        ('Financial', 'Financial'),
        ('Operational', 'Operational'),
        ('Technical', 'Technical'),
    ]
    IMPACT_CHOICES = [
        ('Low', 'Low'),
        ('Moderate', 'Moderate'),
        ('High', 'High'),
        ('Severe', 'Severe'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='risks', help_text="The project this risk is associated with.")
    title = models.CharField(max_length=255, help_text="A short title for the risk.")
    description = models.TextField(help_text="A detailed description of the risk.")
    # --- FIX: Add a dedicated 'risk_category' field ---
    risk_category = models.CharField(max_length=20, choices=RISK_CATEGORY_CHOICES, default='Operational')

    # --- FIX: 'impact' is now its own dedicated field ---
    impact = models.CharField(max_length=10, choices=IMPACT_CHOICES, default='Low')
    likelihood = models.CharField(max_length=10, choices=[
        ('1', '1 - Very Unlikely'),
        ('2', '2 - Unlikely'),
        ('3', '3 - Possible'),
        ('4', '4 - Likely'),
        ('5', '5 - Very Likely'),
    ], default='3', help_text="The likelihood of the risk occurring, on a scale from 1 (low) to 5 (high).")
    status = models.CharField(max_length=20, choices=[
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('mitigated', 'Mitigated'),
        ('closed', 'Closed'),
    ], default='open', help_text="The current status of the risk.")
    risk_rating = models.CharField(max_length=10 , help_text="The calculated risk rating based on likelihood and impact.")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='owned_risks',
        help_text="The user responsible for managing this risk."
    )
    target_mitigation_date = models.DateField(null=True, blank=True, help_text="The target date for mitigating the risk.")
    mitigation_strategy = models.TextField(blank=True, help_text="The plan for mitigating the risk.")
    identified_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Risk '{self.title}' ({self.risk_rating})"

    class Meta:
        ordering = ['-identified_at']

class ActionItem(models.Model):
    """
    Model to store a single compliance-related to-do, task, or approval.
    This model is designed to directly power the ComplianceToDoTracker frontend.
    """
    # Choices that match the frontend configuration
    class Priority(models.TextChoices):
        HIGH = 'High', 'High'
        MEDIUM = 'Medium', 'Medium'
        LOW = 'Low', 'Low'

    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        APPROVED = 'Approved', 'Approved'
        REQUIRED = 'Required', 'Action Required'
        REJECTED = 'Rejected', 'Rejected'

    class Category(models.TextChoices):
        USER_APPROVAL = 'user_approval', 'User Approval'
        RISK_APPROVAL = 'risk_approval', 'Risk Approval'
        AUDITOR_ASSIGNMENT = 'auditor_assignment', 'Auditor Assignment'
        EVIDENCE_APPROVAL = 'evidence_approval', 'Evidence Approval'
        POLICY_APPROVAL = 'policy_approval', 'Policy Approval'
        OTHER = 'Other', 'Other'

    # Relational Fields
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="action_items")
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_actions")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="requested_actions")

    # Core Information matching the frontend card
    title = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=100, help_text="Corresponds to the smaller text line, e.g., 'User Management'") # New field for 'type'
    
    # Metadata Fields
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    category = models.CharField(max_length=50, choices=Category.choices)
    due_date = models.DateField(null=True, blank=True)
    
    # Flexible data for the "Additional Details" section
    details = models.JSONField(default=dict, blank=True, help_text="Additional details in JSON format.")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

# --- NEW MODELS FOR COMMENTS AND REVIEWS ---

class Comment(models.Model):
    """
    A comment made on a specific control (Clause) within a project.
    """
    project = models.ForeignKey('compliance_monitoring.Project', on_delete=models.CASCADE, related_name='comments')
    control = models.ForeignKey(Clause, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    message = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on {self.control.title}"
    
    @property
    def is_reply(self):
        return self.parent is not None

class AuditorReview(models.Model):
    """
    An auditor's review of a specific control (Clause) or subcontrol (SubClause).
    """
    STATUS_CHOICES = [
        ('Accepted', 'Accepted'),
        ('Rejected', 'Rejected'),
        ('Pending Updates', 'Pending Updates'),
    ]
    control = models.ForeignKey(Clause, on_delete=models.CASCADE, related_name='reviews')
    sub_clause = models.ForeignKey(
        SubClause, 
        on_delete=models.CASCADE, 
        related_name='reviews',
        null=True, 
        blank=True,
        help_text="The sub-clause this review is associated with. If null, review is for the main control."
    )
    auditor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    title = models.CharField(max_length=255, default="Review", help_text="Title of the review")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    evidence = models.TextField(blank=True, help_text="Evidence details for the review.")
    evidence_notes = models.TextField(blank=True, help_text="Notes on the evidence provided.")
    conclusion = models.TextField(blank=True, help_text="Final conclusion of the review.")
    warning = models.TextField(blank=True, help_text="Warning message if additional information is required.")
    tags = models.JSONField(default=list, blank=True, help_text="Tags associated with the review.")
    has_upload_option = models.BooleanField(default=True, help_text="Whether upload option is available.")
    has_view_details = models.BooleanField(default=True, help_text="Whether view details option is available.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review '{self.title}' by {self.auditor.username} for {self.control.title} - {self.status}"


class Todo(models.Model):
    """
    Model to store compliance-related todos/tasks for admin-only access.
    This model powers the ComplianceToDoTracker frontend.
    """
    # Choices that match the frontend configuration
    class Priority(models.TextChoices):
        HIGH = 'High', 'High'
        MEDIUM = 'Medium', 'Medium'
        LOW = 'Low', 'Low'

    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        APPROVED = 'Approved', 'Approved'
        REQUIRED = 'Required', 'Action Required'
        REJECTED = 'Rejected', 'Rejected'

    class Category(models.TextChoices):
        USER_APPROVAL = 'user_approval', 'User Approval'
        RISK_APPROVAL = 'risk_approval', 'Risk Approval'
        AUDITOR_ASSIGNMENT = 'auditor_assignment', 'Auditor Assignment'
        EVIDENCE_APPROVAL = 'evidence_approval', 'Evidence Approval'
        POLICY_APPROVAL = 'policy_approval', 'Policy Approval'
        OTHER = 'Other', 'Other'

    # Admin-only access - only admins can create/manage todos
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_todos',
        help_text="The admin who created this todo. Only admins can access todos."
    )
    
    # Optional project association
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name="todos",
        null=True,
        blank=True,
        help_text="The project this todo is associated with (optional)."
    )
    
    # Assignee and requester
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="assigned_todos",
        help_text="The user assigned to complete this todo."
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="requested_todos",
        help_text="The user who requested this todo."
    )

    # Core Information matching the frontend card
    title = models.CharField(max_length=255, help_text="Title of the todo task")
    description = models.TextField(help_text="Detailed description of the todo task")
    type = models.CharField(
        max_length=100, 
        help_text="Type of task, e.g., 'User Management', 'Risk Management', etc."
    )
    
    # Metadata Fields
    priority = models.CharField(
        max_length=10, 
        choices=Priority.choices, 
        default=Priority.MEDIUM,
        help_text="Priority level of the todo"
    )
    status = models.CharField(
        max_length=10, 
        choices=Status.choices, 
        default=Status.PENDING,
        help_text="Current status of the todo"
    )
    category = models.CharField(
        max_length=50, 
        choices=Category.choices,
        help_text="Category of the todo task"
    )
    due_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Due date for completing the todo"
    )
    
    # Flexible data for the "Additional Details" section
    details = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Additional details in JSON format (e.g., user info, risk details, etc.)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Todo"
        verbose_name_plural = "Todos"

    def __str__(self):
        return f"Todo: {self.title} - {self.status}"

    def save(self, *args, **kwargs):
        # Ensure only admins can create todos
        if not self.admin or not self.admin.role:
            raise ValueError("Admin user and role are required to create todos")
        
        # Check if user has admin role (case-insensitive)
        role_name = self.admin.role.name.lower() if self.admin.role.name else ""
        if role_name != 'admin':
            raise ValueError(f"Only admins can create todos. User role: {self.admin.role.name}")
        
        super().save(*args, **kwargs)
