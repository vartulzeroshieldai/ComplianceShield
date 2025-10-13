#grc/auditing/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError
from .models import Log, Risk, ActionItem, Comment, AuditorReview, Todo, Evidence
from .serializers import LogSerializer, RiskSerializer, ActionItemSerializer, CommentSerializer, AuditorReviewSerializer, TodoSerializer
from .utils import create_log
from compliance_monitoring.models import Project, Clause
import os
from collections import Counter

class LogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows logs to be viewed.
    Only accessible by admin users.
    """
    queryset = Log.objects.all()
    serializer_class = LogSerializer
    permission_classes = [IsAdminUser]
    pass

class RiskViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing risks.
    """
    serializer_class = RiskSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing
    
    def get_queryset(self):
        """
        This view should return a list of all risks for the currently
        authenticated user's organization.
        """
        user = self.request.user
        if user.is_authenticated and user.organization:
            return Risk.objects.filter(project__organization=user.organization)
        else:
            # For testing purposes, return all risks when user is not authenticated
            return Risk.objects.all()

    def perform_create(self, serializer):
        """
        Automatically set the owner and associate the risk with the project
        provided in the request data.
        """
        user = self.request.user
        # --- FIX: Get the project from the validated data sent by the frontend ---
        project = serializer.validated_data.get('project')
        
        if not project:
            raise ValidationError("A project must be selected to create a risk.")

        # Ensure the user belongs to the same organization as the project
        if user.organization != project.organization:
            raise ValidationError("You do not have permission to add a risk to this project.")
            
        # Save the risk, automatically setting the owner to the current user
        serializer.save(owner=user)

class ActionItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Action Items (To-Do tasks) for a specific project.
    """
    serializer_class = ActionItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view returns a list of action items.
        If project_pk is provided, returns items for that project.
        Otherwise, returns all action items for the user's organization.
        """
        user = self.request.user
        project_pk = self.kwargs.get('project_pk')
        
        if user.is_authenticated and user.organization:
            if project_pk:
                # Project-specific access
                return ActionItem.objects.filter(
                    project_id=project_pk,
                    project__organization=user.organization
                ).order_by('-id')
            else:
                # Global access - return all action items for user's organization
                return ActionItem.objects.filter(
                    project__organization=user.organization
                ).order_by('-id')
        return ActionItem.objects.none()

    def perform_create(self, serializer):
        """
        Automatically associate the action item, set the requester,
        and apply business logic to calculate fields.
        """
        project_pk = self.kwargs.get('project_pk')
        
        # Get project from URL or from request data
        if project_pk:
            try:
                project = Project.objects.get(pk=project_pk, organization=self.request.user.organization)
            except Project.DoesNotExist:
                raise ValidationError("You do not have permission or the project does not exist.")
        else:
            # For global creation, get project from request data
            project = serializer.validated_data.get('project')
            if not project:
                raise ValidationError("Project must be specified for global action item creation.")
            if project.organization != self.request.user.organization:
                raise ValidationError("You do not have permission to create action items for this project.")
        
        # Get the raw data sent from the frontend
        title = serializer.validated_data.get('title', '').lower()
        description = serializer.validated_data.get('description', '').lower()

        # --- AUTO-CALCULATION LOGIC ---

        # 1. Calculate Priority
        priority = ActionItem.Priority.MEDIUM # Default priority
        if 'breach' in title or 'critical' in title or 'vulnerability' in title:
            priority = ActionItem.Priority.HIGH
        
        # 2. Calculate Category
        category = serializer.validated_data.get('category') # Use provided category if it exists
        if not category: # If frontend didn't specify a category, try to guess
            if 'user access' in description or 'new hire' in description:
                category = ActionItem.Category.USER_APPROVAL
            elif 'risk assessment' in title:
                category = ActionItem.Category.RISK_APPROVAL
            else:
                # You might want to make category a required field from the frontend
                # or have a default. For now, we raise an error if we can't guess.
                raise ValidationError("Category could not be determined and must be provided.")

        # 3. Set a default Status for all new items
        status = ActionItem.Status.REQUIRED

        # Save the object with the calculated values
        serializer.save(
            project=project, 
            requester=self.request.user,
            priority=priority,
            category=category,
            status=status
        )

# --- NEW VIEWSETS FOR COMMENTS AND REVIEWS ---

class CommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for comments on a specific control within a project.
    """
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    def get_queryset(self):
        """
        This view returns a list of all comments for the control
        specified in the URL within the project context. Only returns top-level comments (not replies).
        """
        import sys
        control_id = self.kwargs['control_pk']
        project_id = self.kwargs.get('project_pk')
        
        print(f"\n\n🔍 DEBUG: CommentViewSet.get_queryset() called - control_id={control_id}, project_id={project_id}\n\n", flush=True)
        sys.stderr.write(f"\n\n🔍 STDERR: CommentViewSet.get_queryset() called - control_id={control_id}, project_id={project_id}\n\n")
        sys.stderr.flush()
        
        # Debug: Show ALL comments in database
        all_comments = Comment.objects.all()
        print(f"🔍 DEBUG: Total comments in database: {all_comments.count()}", flush=True)
        for comment in all_comments:
            print(f"🔍 DEBUG: Comment ID {comment.id}: control_id={comment.control_id}, project_id={comment.project_id}, parent={comment.parent}, message='{comment.message[:30]}...'", flush=True)
        
        if project_id:
            # Debug: Show comments for this specific control (regardless of project)
            control_comments = Comment.objects.filter(control_id=control_id)
            print(f"🔍 DEBUG: Comments for control {control_id} (any project): {control_comments.count()}", flush=True)
            for comment in control_comments:
                print(f"🔍 DEBUG: Control comment ID {comment.id}: project_id={comment.project_id}, parent={comment.parent}", flush=True)
            
            # Debug: Show comments for this specific project (regardless of control)
            project_comments = Comment.objects.filter(project_id=project_id)
            print(f"🔍 DEBUG: Comments for project {project_id} (any control): {project_comments.count()}", flush=True)
            for comment in project_comments:
                print(f"🔍 DEBUG: Project comment ID {comment.id}: control_id={comment.control_id}, parent={comment.parent}", flush=True)
            
            queryset = Comment.objects.filter(
                control_id=control_id, 
                project_id=project_id, 
                parent__isnull=True
            ).select_related('author', 'project', 'control')
            print(f"🔍 DEBUG: CommentViewSet.get_queryset() - Found {queryset.count()} comments for project {project_id}, control {control_id}", flush=True)
            return queryset
        else:
            queryset = Comment.objects.filter(
                control_id=control_id, 
                parent__isnull=True
            ).select_related('author', 'project', 'control')
            print(f"🔍 DEBUG: CommentViewSet.get_queryset() - Found {queryset.count()} comments for control {control_id} (no project)", flush=True)
            return queryset

    def perform_create(self, serializer):
        """
        Automatically associate the comment with the control and project from the URL
        and the currently authenticated user.
        """
        import sys
        control_id = self.kwargs['control_pk']
        project_id = self.kwargs.get('project_pk')
        
        print(f"\n\n🔍 DEBUG: CommentViewSet.perform_create() called - control_id={control_id}, project_id={project_id}\n\n", flush=True)
        sys.stderr.write(f"\n\n🔍 STDERR: CommentViewSet.perform_create() called - control_id={control_id}, project_id={project_id}\n\n")
        sys.stderr.flush()
        
        print(f"🔍 DEBUG: CommentViewSet.perform_create() - User: {self.request.user}, Authenticated: {self.request.user.is_authenticated}", flush=True)
        print(f"🔍 DEBUG: CommentViewSet.perform_create() - Serializer data: {serializer.validated_data}", flush=True)
        
        if project_id:
            print(f"🔍 DEBUG: CommentViewSet.perform_create() - Saving with project_id={project_id}", flush=True)
            comment = serializer.save(control_id=control_id, project_id=project_id, author=self.request.user)
            print(f"🔍 DEBUG: CommentViewSet.perform_create() - Comment created successfully with ID: {comment.id}", flush=True)
        else:
            print(f"🔍 DEBUG: CommentViewSet.perform_create() - No project_id, using fallback logic", flush=True)
            # Fallback for backward compatibility - try to get project from control's framework
            from compliance_monitoring.models import Project
            from .models import Clause
            
            try:
                control = Clause.objects.get(id=control_id)
                print(f"🔍 DEBUG: CommentViewSet.perform_create() - Found control: {control.title}", flush=True)
                # Find a project that uses this framework
                project = Project.objects.filter(framework=control.framework).first()
                if project:
                    print(f"🔍 DEBUG: CommentViewSet.perform_create() - Found project: {project.name}", flush=True)
                    comment = serializer.save(control_id=control_id, project_id=project.id, author=self.request.user)
                    print(f"🔍 DEBUG: CommentViewSet.perform_create() - Comment created successfully with ID: {comment.id}", flush=True)
                else:
                    print(f"🔍 DEBUG: CommentViewSet.perform_create() - No project found for framework", flush=True)
                    comment = serializer.save(control_id=control_id, author=self.request.user)
                    print(f"🔍 DEBUG: CommentViewSet.perform_create() - Comment created successfully with ID: {comment.id}", flush=True)
            except Clause.DoesNotExist:
                print(f"🔍 DEBUG: CommentViewSet.perform_create() - Control {control_id} does not exist", flush=True)
                comment = serializer.save(control_id=control_id, author=self.request.user)
                print(f"🔍 DEBUG: CommentViewSet.perform_create() - Comment created successfully with ID: {comment.id}", flush=True)

class AuditorReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for auditor reviews on a specific control.
    """
    serializer_class = AuditorReviewSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    def get_queryset(self):
        """
        This view returns a list of all reviews for the control
        specified in the URL.
        """
        control_id = self.kwargs['control_pk']
        return AuditorReview.objects.filter(control_id=control_id)

    def perform_create(self, serializer):
        """
        Automatically associate the review with the control from the URL
        and the currently authenticated user as the auditor.
        """
        try:
            control_id = self.kwargs['control_pk']
            
            # Get the control to generate a default title if not provided
            try:
                control = Clause.objects.get(id=control_id)
                default_title = f"Review for {control.title}"
            except Clause.DoesNotExist:
                default_title = f"Review {control_id}"
            
            # Set default title if not provided
            title = serializer.validated_data.get('title', default_title)
            
            # For testing purposes, get the first user if no authenticated user
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            if self.request.user.is_authenticated:
                auditor = self.request.user
            else:
                # For testing, use the first available user or create a default one
                auditor = User.objects.first()
                if not auditor:
                    # Create a default user for testing
                    auditor = User.objects.create_user(
                        username='test_auditor',
                        email='test@example.com',
                        password='testpass123'
                    )
            
            # Get sub_clause from the request data
            sub_clause = serializer.validated_data.get('sub_clause')
            
            print(f"Creating auditor review - Control ID: {control_id}, Sub_clause: {sub_clause}, Title: {title}")
            
            # Save the auditor review
            review = serializer.save(
                control_id=control_id, 
                auditor=auditor,
                title=title,
                sub_clause=sub_clause
            )
            
            # Create a log entry for auditor review creation
            create_log(
                user=auditor,
                action=f"Created auditor review: {title}",
                module="Auditor Review",
                level="success",
                details=f"Review ID: {review.id}, Control ID: {control_id}, Sub-clause: {sub_clause.sub_clause_number if sub_clause else 'None'}"
            )
        except Exception as e:
            print(f"Error in perform_create: {e}")
            raise ValidationError(f"Error creating review: {str(e)}")

    def perform_update(self, serializer):
        """
        Log auditor review updates.
        """
        review = serializer.save()
        user = self.request.user if self.request.user.is_authenticated else None
        
        if user:
            create_log(
                user=user,
                action=f"Updated auditor review: {review.title}",
                module="Auditor Review",
                level="info",
                details=f"Review ID: {review.id}, Control ID: {review.control.id}"
            )

    def perform_destroy(self, instance):
        """
        Log auditor review deletion.
        """
        review_title = instance.title
        review_id = instance.id
        control_id = instance.control.id
        user = self.request.user if self.request.user.is_authenticated else None
        
        if user:
            create_log(
                user=user,
                action=f"Deleted auditor review: {review_title}",
                module="Auditor Review",
                level="warning",
                details=f"Review ID: {review_id}, Control ID: {control_id}"
            )
        
        instance.delete()


class TodoViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Todos with admin-only access.
    Only admins can create, read, update, and delete todos.
    """
    serializer_class = TodoSerializer
    permission_classes = [IsAdminUser]  # Only admins can access todos

    def get_queryset(self):
        """
        Return todos created by the current admin user.
        """
        user = self.request.user
        if user.is_authenticated and user.role and user.role.name == 'Admin':
            return Todo.objects.filter(admin=user)
        return Todo.objects.none()

    def perform_create(self, serializer):
        """
        Automatically set the admin to the current user.
        """
        user = self.request.user
        if not user.role or user.role.name != 'Admin':
            raise ValidationError("Only admins can create todos")
        
        serializer.save(admin=user)
        
        # Create a log entry for todo creation
        create_log(
            user=user,
            action=f"Created todo: {serializer.validated_data.get('title', 'Untitled')}",
            module="Todo Management",
            level="info",
            details=f"Todo category: {serializer.validated_data.get('category', 'Unknown')}"
        )

    def perform_update(self, serializer):
        """
        Log todo updates and handle user approval actions.
        """
        todo = serializer.save()
        user = self.request.user
        
        # Handle user approval actions
        if todo.category == 'user_approval' and 'status' in serializer.validated_data:
            new_status = serializer.validated_data['status']
            if new_status in ['Approved', 'Rejected']:
                # Update the associated user's status
                user_id = todo.details.get('userId')
                if user_id:
                    try:
                        from accounts.models import User
                        target_user = User.objects.get(id=user_id)
                        target_user.status = 'active' if new_status == 'Approved' else 'pending_approval'
                        target_user.save()
                        
                        create_log(
                            user=user,
                            action=f"User {new_status.lower()}d: {target_user.username}",
                            module="User Management",
                            level="success" if new_status == 'Approved' else "warning",
                            details=f"User ID: {user_id}, Todo ID: {todo.id}"
                        )
                    except User.DoesNotExist:
                        create_log(
                            user=user,
                            action=f"Failed to update user status for todo: {todo.title}",
                            module="Todo Management",
                            level="error",
                            details=f"User ID {user_id} not found, Todo ID: {todo.id}"
                        )
        
        create_log(
            user=user,
            action=f"Updated todo: {todo.title}",
            module="Todo Management",
            level="info",
            details=f"Todo ID: {todo.id}, New status: {todo.status}"
        )

    def perform_destroy(self, instance):
        """
        Log todo deletion.
        """
        todo_title = instance.title
        todo_id = instance.id
        user = self.request.user
        
        create_log(
            user=user,
            action=f"Deleted todo: {todo_title}",
            module="Todo Management",
            level="warning",
            details=f"Todo ID: {todo_id}"
        )
        
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_evidence_collection_stats(request):
    """
    Get evidence collection statistics for dashboard visualization
    """
    try:
        print(f"🔍 Evidence Collection Stats - User: {request.user.username}")
        
        # Get all evidence for the authenticated user's organization
        evidence_queryset = Evidence.objects.all()
        
        # If user has organization, filter by organization
        if hasattr(request.user, 'organization') and request.user.organization:
            evidence_queryset = evidence_queryset.filter(project__organization=request.user.organization)
        
        # Get evidence with files
        evidence_with_files = evidence_queryset.exclude(file__isnull=True).exclude(file='')
        
        print(f"🔍 Found {evidence_with_files.count()} evidence items with files")
        
        # Define evidence categories based on file extensions
        evidence_categories = {
            "Policy Docs": [".pdf", ".docx", ".doc"],
            "Technical Logs": [".log", ".txt", ".csv"],
            "Procedural Records": [".pdf", ".docx", ".doc"],
            "Audit Reports": [".pdf", ".xlsx", ".csv"],
            "Screenshots": [".jpg", ".png", ".jpeg"],
            "Other Files": []
        }
        
        # Count evidence by category
        category_counts = {}
        total_evidence = 0
        
        for category, extensions in evidence_categories.items():
            count = 0
            for evidence in evidence_with_files:
                if evidence.file:
                    file_extension = os.path.splitext(evidence.file.name)[1].lower()
                    if extensions and file_extension in extensions:
                        count += 1
                    elif not extensions:  # "Other Files" category
                        # Check if file extension is not in any other category
                        is_in_other_category = False
                        for other_category, other_extensions in evidence_categories.items():
                            if other_category != category and file_extension in other_extensions:
                                is_in_other_category = True
                                break
                        if not is_in_other_category:
                            count += 1
            
            category_counts[category] = count
            total_evidence += count
        
        print(f"🔍 Evidence category counts: {category_counts}")
        print(f"🔍 Total evidence: {total_evidence}")
        
        # Prepare response data
        evidence_data = []
        colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
        
        for i, (category, count) in enumerate(category_counts.items()):
            if count > 0:  # Only include categories with evidence
                evidence_data.append({
                    "label": category,
                    "count": count,
                    "color": colors[i % len(colors)]
                })
        
        return Response({
            'evidence_data': evidence_data,
            'summary': {
                'total_evidence': total_evidence,
                'categories_count': len([d for d in evidence_data if d['count'] > 0]),
                'last_updated': evidence_with_files.first().uploaded_at.isoformat() if evidence_with_files.exists() else None
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve evidence collection stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to retrieve evidence collection stats: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
