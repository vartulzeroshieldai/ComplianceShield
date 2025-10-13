#grc/auditing/serializers.py
from rest_framework import serializers
from .models import Log, Risk, ActionItem, Comment, AuditorReview, Todo

class LogSerializer(serializers.ModelSerializer):
    # To display the username instead of the user ID
    user = serializers.CharField(source='user.username', read_only=True, default='system')

    class Meta:
        model = Log
        fields = ['id', 'timestamp', 'level', 'user', 'action', 'module', 'details']

# --- ADD THIS NEW SERIALIZER ---
class RiskSerializer(serializers.ModelSerializer):
    # To show the owner's name instead of ID
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    # To show the project name instead of ID
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Risk
        fields = [
            'id', 'project', 'project_name', 'title', 'description', 
            'risk_category', 'impact', 'likelihood', 'status', 'risk_rating', 
            'owner', 'owner_name', 'target_mitigation_date', 'mitigation_strategy', 
            'identified_at', 'updated_at'
        ]
        # --- FIX: Allow 'project' to be written on creation and make 'owner' read-only ---
        extra_kwargs = {
            'owner': {'read_only': True} 
        }

class ActionItemSerializer(serializers.ModelSerializer):
    # To show names instead of IDs in the API response
    assignee_name = serializers.CharField(source='assignee.username', read_only=True, allow_null=True)
    requester_name = serializers.CharField(source='requester.username', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ActionItem
        fields = [
            'id', 'project', 'project_name', 'title', 'type', 'description', 'priority', 
            'status', 'category', 'due_date', 'details',
            'assignee', 'assignee_name', 'requester', 'requester_name'
        ]
        # Make relational fields write-only with IDs but read-only with full data
        extra_kwargs = {
            'assignee': {'write_only': True},
            'requester': {'write_only': True},
            'project': {'write_only': True}
        }

# --- NEW SERIALIZERS FOR COMMENTS AND REVIEWS ---

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    control_title = serializers.CharField(source='control.title', read_only=True)
    control_clause_number = serializers.CharField(source='control.clause_number', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'project', 'project_name', 'control', 'control_title', 'control_clause_number', 'author', 'author_name', 'message', 'parent', 'replies', 'created_at']
        extra_kwargs = {
            'author': {'read_only': True},
            'project': {'write_only': True, 'required': True},
            'control': {'write_only': True, 'required': False},
            'parent': {'write_only': True, 'required': False},
        }
    
    def get_replies(self, obj):
        """Get nested replies for this comment"""
        replies = obj.replies.all().order_by('created_at')
        return CommentSerializer(replies, many=True, context=self.context).data

class AuditorReviewSerializer(serializers.ModelSerializer):
    # Auditor information
    auditor_name = serializers.CharField(source='auditor.username', read_only=True)
    auditor = serializers.SerializerMethodField()
    
    # Date formatting
    date = serializers.SerializerMethodField()
    
    # Boolean fields for frontend
    hasUploadOption = serializers.BooleanField(source='has_upload_option')
    hasViewDetails = serializers.BooleanField(source='has_view_details')

    class Meta:
        model = AuditorReview
        fields = [
            'id', 'control', 'sub_clause', 'title', 'status', 'date', 'auditor', 'auditor_name',
            'evidence', 'evidence_notes', 'conclusion', 'warning', 'tags',
            'hasUploadOption', 'hasViewDetails', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'control': {'write_only': True, 'required': False},
            'sub_clause': {'required': False},  # Remove write_only to include in response
        }
    
    def get_auditor(self, obj):
        """Return auditor information in the format expected by frontend"""
        if obj.auditor:
            # Create avatar from first letters of first and last name
            name_parts = obj.auditor.get_full_name().split() if obj.auditor.get_full_name() else [obj.auditor.username]
            if len(name_parts) >= 2:
                avatar = name_parts[0][0].upper() + name_parts[1][0].upper()
            else:
                avatar = name_parts[0][:2].upper()
                
            return {
                'name': obj.auditor.get_full_name() or obj.auditor.username,
                'role': obj.auditor.role.name if obj.auditor.role else 'Auditor',
                'avatar': avatar
            }
        return None
    
    def get_date(self, obj):
        """Return formatted date string"""
        return obj.created_at.strftime('%Y-%m-%d') if obj.created_at else None


class TodoSerializer(serializers.ModelSerializer):
    """
    Serializer for Todo model with admin-only access.
    """
    # Display names instead of IDs
    admin_name = serializers.CharField(source='admin.username', read_only=True)
    assignee_name = serializers.CharField(source='assignee.username', read_only=True, allow_null=True)
    requester_name = serializers.CharField(source='requester.username', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)
    
    # Actions field for frontend compatibility
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Todo
        fields = [
            'id', 'title', 'description', 'type', 'priority', 'status', 'category',
            'due_date', 'details', 'admin', 'admin_name', 'project', 'project_name',
            'assignee', 'assignee_name', 'requester', 'requester_name',
            'actions', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'admin': {'read_only': True},  # Admin is set automatically
            'assignee': {'write_only': True},
            'requester': {'write_only': True},
            'project': {'write_only': True},
        }

    def get_actions(self, obj):
        """Return available actions based on category"""
        if obj.category == 'user_approval':
            return ['Approve', 'Reject']
        elif obj.category == 'auditor_assignment':
            return ['Assign Auditor', 'View Details']
        else:
            return ['Approve', 'Reject']

    def create(self, validated_data):
        """Override create to ensure admin is set from request user"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['admin'] = request.user
        return super().create(validated_data)