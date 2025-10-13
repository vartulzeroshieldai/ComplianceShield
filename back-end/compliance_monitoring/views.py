# GRC/compliance_monitoring/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
# --- Add IsAuthenticated and Project imports ---
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Framework, Clause, SubClause, Project, ProjectMember
from .serializers import FrameworkSerializer, ClauseSerializer, SubClauseSerializer, ProjectSerializer, EvidenceSerializer
from .permissions import IsProjectOwnerOrMember, CanEditProject, IsOrganizationMember
# Import Evidence model and serializer
from auditing.models import Evidence
from auditing.utils import create_log
from accounts.models import User
from django.utils import timezone

class FrameworkViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows frameworks to be viewed or edited.
    """
    queryset = Framework.objects.all()
    serializer_class = FrameworkSerializer
    permission_classes = [AllowAny]

class ClauseViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows clauses to be viewed or edited.
    """
    queryset = Clause.objects.all()
    serializer_class = ClauseSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    @action(detail=True, methods=['get', 'post'])
    def reviews(self, request, pk=None):
        """
        Get or create auditor reviews for a specific control.
        """
        control = self.get_object()
        
        if request.method == 'GET':
            # Get all reviews for this control
            from auditing.models import AuditorReview
            from auditing.serializers import AuditorReviewSerializer
            
            reviews = AuditorReview.objects.filter(control=control)
            serializer = AuditorReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Create new review for this control
            from auditing.models import AuditorReview
            from auditing.serializers import AuditorReviewSerializer
            
            serializer = AuditorReviewSerializer(data=request.data)
            if serializer.is_valid():
                # Set the auditor to the current user if authenticated, otherwise None
                auditor = request.user if request.user.is_authenticated else None
                
                # Set default title if not provided
                if not serializer.validated_data.get('title'):
                    serializer.validated_data['title'] = f"Review for {control.title}"
                
                # Save the review
                review = serializer.save(control=control, auditor=auditor)
                
                # Create a log entry for review creation
                if auditor:
                    create_log(
                        user=auditor,
                        action=f"Created review: {review.title}",
                        module="Audit Review",
                        level="success",
                        details=f"Review ID: {review.id}, Control ID: {control.id}, Control: {control.title}"
                    )
                else:
                    create_log(
                        user=None,
                        action=f"Created review: {review.title}",
                        module="Audit Review", 
                        level="success",
                        details=f"Review ID: {review.id}, Control ID: {control.id}, Control: {control.title}"
                    )
                
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)

    @action(detail=True, methods=['get'])
    def subcontrols(self, request, pk=None):
        """
        Get all subcontrols for a specific control.
        """
        control = self.get_object()
        
        # Get all subcontrols for this control
        subcontrols = SubClause.objects.filter(clause=control)
        serializer = SubClauseSerializer(subcontrols, many=True)
        return Response(serializer.data)


class SubClauseViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows sub-clauses to be viewed or edited.
    """
    serializer_class = SubClauseSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    def get_queryset(self):
        """
        This view returns a list of all sub-clauses for the control
        specified in the URL.
        """
        control_id = self.kwargs.get('control_pk')
        if control_id:
            return SubClause.objects.filter(clause_id=control_id)
        return SubClause.objects.all()

# --- NEW PROJECT VIEWSET ---
class ProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows projects to be viewed or edited.
    This endpoint is protected and requires authentication.
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return projects that the user has access to:
        1. Projects owned by the user
        2. Projects in the same organization
        3. Projects where the user is an explicit member
        """
        if not self.request.user.is_authenticated:
            return Project.objects.none()
            
        user = self.request.user
        
        # Get projects where user is owner
        owned_projects = Project.objects.filter(owner=user)
        
        # Get projects in the same organization
        org_projects = Project.objects.filter(organization=user.organization)
        
        # Get projects where user is an explicit member
        member_projects = Project.objects.filter(project_members__user=user)
        
        # Combine all querysets and remove duplicates
        all_projects = (owned_projects | org_projects | member_projects).distinct()
        
        return all_projects

    def perform_create(self, serializer):
        """
        Automatically set the owner and organization when creating a new project.
        """
        serializer.save(owner=self.request.user, organization=self.request.user.organization)

    def get_permissions(self):
        """
        Return appropriate permissions based on the action.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['create']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, CanEditProject]
        else:
            permission_classes = [IsAuthenticated]
            
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=['get'])
    def controls(self, request, pk=None):
        """
        Get all controls (clauses) for a specific project's framework.
        """
        project = self.get_object()
        controls = Clause.objects.filter(framework=project.framework)
        serializer = ClauseSerializer(controls, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def team_members(self, request, pk=None):
        """
        Get actual team members for a specific project.
        Returns only the project owner and explicitly added project members.
        """
        project = self.get_object()
        
        # Check if user has access to this project
        if not project.has_access(request.user):
            return Response({'error': 'Access denied'}, status=403)
        
        # Get explicit project members
        project_members = ProjectMember.objects.filter(project=project)
        
        # Format the response to match frontend expectations
        members_data = []
        
        # Always include the project owner
        if project.owner:
            members_data.append({
                'id': project.owner.id,
                'name': project.owner.get_full_name() or project.owner.username,
                'username': project.owner.username,
                'email': project.owner.email,
                'role': project.owner.role.name if project.owner.role else 'Owner',
                'avatar': self._generate_avatar(project.owner),
                'is_owner': True,
                'is_explicit_member': False,
                'permission_level': 'owner',
                'can_edit': True,
            })
        
        # Add explicitly added project members
        for project_member in project_members:
            member = project_member.user
            members_data.append({
                'id': member.id,
                'name': member.get_full_name() or member.username,
                'username': member.username,
                'email': member.email,
                'role': member.role.name if member.role else 'Member',
                'avatar': self._generate_avatar(member),
                'is_owner': False,
                'is_explicit_member': True,
                'permission_level': project_member.permission_level,
                'can_edit': project.can_edit(member),
            })
        
        return Response(members_data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """
        Add a user as an explicit member to the project.
        """
        project = self.get_object()
        
        # Only project owners and admins can add members
        if not (project.owner == request.user or 
                project.project_members.filter(user=request.user, permission_level='admin').exists()):
            return Response({'error': 'Permission denied'}, status=403)
        
        user_id = request.data.get('user_id')
        permission_level = request.data.get('permission_level', 'view')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        
        # Check if user is in the same organization
        if user.organization != project.organization:
            return Response({'error': 'User must be in the same organization'}, status=400)
        
        # Create or update project member
        project_member, created = ProjectMember.objects.get_or_create(
            project=project,
            user=user,
            defaults={
                'permission_level': permission_level,
                'added_by': request.user
            }
        )
        
        if not created:
            project_member.permission_level = permission_level
            project_member.save()
        
        return Response({
            'message': 'Member added successfully',
            'member': {
                'id': user.id,
                'username': user.username,
                'permission_level': project_member.permission_level
            }
        })

    @action(detail=True, methods=['post'])
    def add_auditor(self, request, pk=None):
        """
        Add an auditor to the project.
        """
        project = self.get_object()
        
        # Only project owners and admins can add auditors
        if not (project.owner == request.user or 
                project.project_members.filter(user=request.user, permission_level='admin').exists()):
            return Response({'error': 'Permission denied'}, status=403)
        
        auditor_id = request.data.get('auditor_id')
        
        if not auditor_id:
            return Response({'error': 'auditor_id is required'}, status=400)
        
        try:
            auditor = User.objects.get(id=auditor_id)
        except User.DoesNotExist:
            return Response({'error': 'Auditor not found'}, status=404)
        
        # Check if user is in the same organization
        if auditor.organization != project.organization:
            return Response({'error': 'Auditor must be in the same organization'}, status=400)
        
        # Check if user has Auditor role
        from accounts.models import Role
        auditor_role = Role.objects.filter(name='Auditor').first()
        if not auditor_role or auditor.role != auditor_role:
            return Response({'error': 'User must have Auditor role'}, status=400)
        
        # Create auditor assignment
        from accounts.models import Auditors
        auditor_assignment, created = Auditors.objects.get_or_create(
            user=auditor,
            project=project,
            organization=project.organization
        )
        
        if not created:
            return Response({'error': 'Auditor is already assigned to this project'}, status=400)
        
        return Response({
            'message': 'Auditor added successfully',
            'auditor': {
                'id': auditor.id,
                'username': auditor.username,
                'name': auditor.get_full_name() or auditor.username
            }
        })

    @action(detail=True, methods=['get'])
    def auditors(self, request, pk=None):
        """
        List auditors assigned to this project.
        """
        project = self.get_object()
        
        from accounts.models import Auditors
        auditor_assignments = Auditors.objects.filter(project=project)
        
        auditors_data = []
        for assignment in auditor_assignments:
            auditors_data.append({
                'id': assignment.user.id,
                'username': assignment.user.username,
                'name': assignment.user.get_full_name() or assignment.user.username,
                'email': assignment.user.email,
                'organization': assignment.user.organization.name if assignment.user.organization else 'Unknown',
                'assigned_at': assignment.assigned_at,
            })
        
        return Response(auditors_data)

    @action(detail=True, methods=['delete'])
    def remove_auditor(self, request, pk=None):
        """
        Remove an auditor from the project.
        """
        project = self.get_object()
        
        # Only project owners and admins can remove auditors
        if not (project.owner == request.user or 
                project.project_members.filter(user=request.user, permission_level='admin').exists()):
            return Response({'error': 'Permission denied'}, status=403)
        
        auditor_id = request.data.get('auditor_id')
        
        if not auditor_id:
            return Response({'error': 'auditor_id is required'}, status=400)
        
        try:
            from accounts.models import Auditors
            auditor_assignment = Auditors.objects.get(project=project, user_id=auditor_id)
            auditor_assignment.delete()
            return Response({'message': 'Auditor removed successfully'})
        except Auditors.DoesNotExist:
            return Response({'error': 'Auditor assignment not found'}, status=404)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """
        Remove a user from the project.
        """
        project = self.get_object()
        
        # Only project owners and admins can remove members
        if not (project.owner == request.user or 
                project.project_members.filter(user=request.user, permission_level='admin').exists()):
            return Response({'error': 'Permission denied'}, status=403)
        
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)
        
        try:
            project_member = ProjectMember.objects.get(project=project, user_id=user_id)
            project_member.delete()
            return Response({'message': 'Member removed successfully'})
        except ProjectMember.DoesNotExist:
            return Response({'error': 'Member not found'}, status=404)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Get all comments for all controls in this project.
        """
        project = self.get_object()
        
        # Check if user has access to this project
        if not project.has_access(request.user):
            return Response({'error': 'Access denied'}, status=403)
        
        from auditing.models import Comment
        from auditing.serializers import CommentSerializer
        
        # Get all controls for this project's framework
        controls = Clause.objects.filter(framework=project.framework)
        control_ids = controls.values_list('id', flat=True)
        
        # Get all comments for these controls
        comments = Comment.objects.filter(control_id__in=control_ids).select_related('author', 'control')
        
        # Serialize comments with additional context
        comments_data = []
        for comment in comments:
            comment_data = CommentSerializer(comment).data
            comment_data['control_title'] = comment.control.title
            comment_data['control_clause_number'] = comment.control.clause_number
            comment_data['project_id'] = project.id
            comment_data['project_name'] = project.name
            comments_data.append(comment_data)
        
        return Response(comments_data)

    def _generate_avatar(self, user):
        """
        Generate avatar initials from user's name.
        """
        name_parts = user.get_full_name().split() if user.get_full_name() else [user.username]
        if len(name_parts) >= 2:
            return name_parts[0][0].upper() + name_parts[1][0].upper()
        else:
            return name_parts[0][:2].upper()

    @action(detail=True, methods=['get', 'post'])
    def evidence(self, request, pk=None):
        """
        Get or create evidence for a specific project.
        """
        project = self.get_object()
        
        # Check if user has access to this project
        if not project.has_access(request.user):
            return Response({'error': 'Access denied'}, status=403)
        
        if request.method == 'GET':
            # Get all evidence for this project
            evidence = Evidence.objects.filter(project=project)
            serializer = EvidenceSerializer(evidence, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Create new evidence for this project
            serializer = EvidenceSerializer(data=request.data)
            if serializer.is_valid():
                # Set the creator to the current user if authenticated, otherwise None
                created_by = request.user if request.user.is_authenticated else None
                
                # Save the evidence
                evidence = serializer.save(project=project, created_by=created_by)
                
                # Create a log entry for evidence creation
                if created_by:
                    create_log(
                        user=created_by,
                        action=f"Created evidence: {evidence.evidence_name}",
                        module="Evidence Management",
                        level="success",
                        details=f"Evidence ID: {evidence.id}, Project ID: {project.id}, Sub-clause: {evidence.sub_clause.sub_clause_number if evidence.sub_clause else 'None'}"
                    )
                else:
                    create_log(
                        user=None,
                        action=f"Created evidence: {evidence.evidence_name}",
                        module="Evidence Management", 
                        level="success",
                        details=f"Evidence ID: {evidence.id}, Project ID: {project.id}, Sub-clause: {evidence.sub_clause.sub_clause_number if evidence.sub_clause else 'None'}"
                    )
                
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)

class EvidenceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing evidence related to a specific project.
    """
    serializer_class = EvidenceSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    def get_queryset(self):
        """
        This view returns a list of all evidence for the project
        specified in the URL (e.g., /projects/5/evidence/).
        """
        project_id = self.kwargs['project_pk']
        return Evidence.objects.filter(project_id=project_id)

    def perform_create(self, serializer):
        """
        Automatically associate the new evidence with the project from the URL.
        """
        project_id = self.kwargs['project_pk']
        # Set the creator to the current user if authenticated, otherwise None
        created_by = self.request.user if self.request.user.is_authenticated else None

        print(f"🔍 DEBUG: perform_create called for evidence, project_id={project_id}, created_by={created_by}")

        # Save the evidence
        evidence = serializer.save(project_id=project_id, created_by=created_by)

        print(f"🔍 DEBUG: Evidence saved with ID: {evidence.id}, approval_status: {evidence.approval_status}")

        # Create a log entry for evidence creation
        if created_by:
            create_log(
                user=created_by,
                action=f"Created evidence: {evidence.evidence_name}",
                module="Evidence Management",
                level="success",
                details=f"Evidence ID: {evidence.id}, Project ID: {project_id}, Sub-clause: {evidence.sub_clause.sub_clause_number if evidence.sub_clause else 'None'}"
            )
        else:
            create_log(
                user=None,
                action=f"Created evidence: {evidence.evidence_name}",
                module="Evidence Management",
                level="success",
                details=f"Evidence ID: {evidence.id}, Project ID: {project_id}, Sub-clause: {evidence.sub_clause.sub_clause_number if evidence.sub_clause else 'None'}"
            )

        # ActionItem creation is now handled automatically by Evidence.save() method

    def perform_update(self, serializer):
        """
        Log evidence updates.
        """
        evidence = serializer.save()
        user = self.request.user if self.request.user.is_authenticated else None
        
        if user:
            create_log(
                user=user,
                action=f"Updated evidence: {evidence.evidence_name}",
                module="Evidence Management",
                level="info",
                details=f"Evidence ID: {evidence.id}, Project ID: {evidence.project.id}"
            )

    def perform_destroy(self, instance):
        """
        Log evidence deletion.
        """
        evidence_name = instance.evidence_name
        evidence_id = instance.id
        project_id = instance.project.id
        user = self.request.user if self.request.user.is_authenticated else None
        
        if user:
            create_log(
                user=user,
                action=f"Deleted evidence: {evidence_name}",
                module="Evidence Management",
                level="warning",
                details=f"Evidence ID: {evidence_id}, Project ID: {project_id}"
            )
        
        instance.delete()

    @action(detail=True, methods=['post'])
    def approve_evidence(self, request, project_pk=None, pk=None):
        """
        Approve or reject evidence.
        """
        evidence = self.get_object()
        action = request.data.get('action')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')
        
        if action not in ['approve', 'reject']:
            return Response({'error': 'Action must be "approve" or "reject"'}, status=400)
        
        # Update evidence approval status
        if action == 'approve':
            evidence.approval_status = 'approved'
            evidence.approved_by = request.user
            evidence.approved_at = timezone.now()
            evidence.approval_notes = notes
        else:  # reject
            evidence.approval_status = 'rejected'
            evidence.approved_by = request.user
            evidence.approved_at = timezone.now()
            evidence.approval_notes = notes
        
        evidence.save()
        
        # Update related ActionItem status
        from auditing.models import ActionItem
        try:
            action_item = ActionItem.objects.filter(
                project=evidence.project,
                category=ActionItem.Category.EVIDENCE_APPROVAL,
                details__evidence_id=evidence.id
            ).first()
            
            if action_item:
                action_item.status = ActionItem.Status.APPROVED if action == 'approve' else ActionItem.Status.REJECTED
                action_item.save()
        except Exception as e:
            create_log(
                user=request.user,
                action=f"Failed to update ActionItem status: {str(e)}",
                module="Evidence Management",
                level="warning",
                details=f"Evidence ID: {evidence.id}, Action: {action}"
            )
        
        # Log the approval action
        create_log(
            user=request.user,
            action=f"Evidence {action}d: {evidence.evidence_name}",
            module="Evidence Management",
            level="success",
            details=f"Evidence ID: {evidence.id}, Project ID: {evidence.project.id}, Notes: {notes}"
        )
        
        # Return updated evidence data
        serializer = self.get_serializer(evidence)
        return Response({
            'message': f'Evidence {action}d successfully',
            'evidence': serializer.data
        })