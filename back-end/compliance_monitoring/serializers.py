#grc/compliance_monitoring/serializers.py
from rest_framework import serializers
# --- Add Project to imports ---
from .models import Framework, Clause, SubClause, Project, ProjectMember
from auditing.models import Evidence 


class SubClauseSerializer(serializers.ModelSerializer):
    """
    Serializes SubClause data into a JSON-compatible format.
    """
    class Meta:
        model = SubClause
        fields = ['id', 'sub_clause_number', 'title', 'description']


class ClauseSerializer(serializers.ModelSerializer):
    """
    Serializes Clause data.
    It also includes a nested representation of all its related sub-clauses.
    """
    sub_clauses = SubClauseSerializer(many=True, read_only=True)
    framework_id = serializers.IntegerField(source='framework.id', read_only=True)
    framework_name = serializers.CharField(source='framework.name', read_only=True)

    class Meta:
        model = Clause
        fields = ['id', 'clause_number', 'title', 'description', 'sub_clauses', 'framework_id', 'framework_name']


class FrameworkSerializer(serializers.ModelSerializer):
    """
    Serializes Framework data.
    It includes a nested representation of all its related clauses.
    """
    clauses = ClauseSerializer(many=True, read_only=True)

    class Meta:
        model = Framework
        fields = ['id', 'name', 'description', 'clauses']

# --- NEW PROJECT SERIALIZER ---
# --- MODIFICATION IS HERE ---
class ProjectSerializer(serializers.ModelSerializer):
    framework_name = serializers.CharField(source='framework.name', read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True, allow_null=True)

    # 1. ADD THIS LINE: This field will serialize all clauses from the project's framework.
    #    The 'source' tells Django to look at the project's 'framework' and then find its 'clauses'.
    #    The name 'controlsData' is chosen to exactly match what the frontend expects.
    controlsData = ClauseSerializer(source='framework.clauses', many=True, read_only=True)
    
    # Add evidence and control counts for dashboard
    evidence_count = serializers.SerializerMethodField()
    control_count = serializers.SerializerMethodField()
    
    def get_evidence_count(self, obj):
        """Return the count of evidence items for this project"""
        count = Evidence.objects.filter(project=obj).count()
        print(f"ProjectSerializer - Project: {obj.name}, Evidence count: {count}")
        return count
    
    def get_control_count(self, obj):
        """Return the count of controls (clauses) for this project's framework"""
        if obj.framework:
            count = obj.framework.clauses.count()
            print(f"ProjectSerializer - Project: {obj.name}, Framework: {obj.framework.name}, Control count: {count}")
            return count
        return 0


    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'framework', 'framework_name',
            'owner', 'owner_name', 'organization', 'status', 'progress', 
            'created_at', 'updated_at', 'auditor_enabled',
            # 2. ADD 'controlsData' TO THE LIST OF FIELDS
            'controlsData',
            # Add evidence and control counts
            'evidence_count', 'control_count'
        ]

class ProjectMemberSerializer(serializers.ModelSerializer):
    """
    Serializes ProjectMember data.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    added_by_name = serializers.CharField(source='added_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = ProjectMember
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_full_name',
            'permission_level', 'added_by', 'added_by_name', 'added_at'
        ]
        read_only_fields = ['added_by', 'added_at']
    
    def get_user_full_name(self, obj):
        """Return user's full name with fallback to username"""
        return obj.user.get_full_name() or obj.user.username

class EvidenceSerializer(serializers.ModelSerializer):
    clause_number = serializers.CharField(source='clause.clause_number', read_only=True, allow_null=True)
    sub_clause_number = serializers.CharField(source='sub_clause.sub_clause_number', read_only=True, allow_null=True)
    clauses = serializers.PrimaryKeyRelatedField(
        queryset=Clause.objects.all(), 
        many=True, 
        required=False
    )
    
    # Add creator information
    created_by = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    creator_name = serializers.SerializerMethodField()
    
    # Map uploaded_at to created_at for frontend compatibility
    created_at = serializers.DateTimeField(source='uploaded_at', read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    # Add file information
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    # Add approval information
    approved_by_name = serializers.SerializerMethodField()
    approver_name = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = [
            'id', 'evidence_name', 'description', 
            'evidence_content', 'file', 'uploaded_at', 
            'project', 'clauses', 'sub_clause',
            'clause_number', 'sub_clause_number',
            # Add the missing fields for frontend compatibility
            'created_by', 'creator_name', 'created_at', 'updated_at',
            'file_name', 'file_size', 'file_url',
            # Add approval fields
            'approval_status', 'approved_by', 'approved_by_name', 'approved_at', 'approval_notes', 'approver_name'
        ]
        extra_kwargs = { 'project': {'read_only': True} }
    
    def get_creator_name(self, obj):
        """Return creator name with fallback"""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "System User"  # Default value if no creator
    
    def get_file_name(self, obj):
        """Extract file name from file path"""
        if obj.file:
            return obj.file.name.split('/')[-1]  # Get just the filename
        return None
    
    def get_file_size(self, obj):
        """Get file size in bytes"""
        if obj.file:
            try:
                return obj.file.size
            except (OSError, ValueError):
                return None
        return None
    
    def get_file_url(self, obj):
        """Get full file URL"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_approved_by_name(self, obj):
        """Return approver name with fallback"""
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None
    
    def get_approver_name(self, obj):
        """Return approver name (alias for approved_by_name)"""
        return self.get_approved_by_name(obj)