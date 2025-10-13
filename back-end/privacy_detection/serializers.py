from rest_framework import serializers
from .models import PrivacyDetectionProject, PrivacyScan, PrivacyFinding, PrivacyReport, PIAResult, DPIAResult, RoPAResult
from compliance_monitoring.serializers import ProjectSerializer

class PrivacyFindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyFinding
        fields = [
            'id', 'finding_type', 'title', 'description', 'severity', 
            'status', 'recommendation', 'file_path', 'line_number',
            'created_at', 'updated_at'
        ]

class PrivacyScanSerializer(serializers.ModelSerializer):
    findings = PrivacyFindingSerializer(many=True, read_only=True)
    findings_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PrivacyScan
        fields = [
            'id', 'scan_type', 'status', 'results', 'findings_count',
            'risk_level', 'started_at', 'completed_at', 'created_at', 'findings'
        ]

class PrivacyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyReport
        fields = [
            'id', 'report_type', 'status', 'content', 
            'generated_at', 'updated_at'
        ]

class PrivacyDetectionProjectSerializer(serializers.ModelSerializer):
    scans = PrivacyScanSerializer(many=True, read_only=True)
    reports = PrivacyReportSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    compliance_project_name = serializers.CharField(source='compliance_project.name', read_only=True)
    total_scans = serializers.SerializerMethodField()
    completed_scans = serializers.SerializerMethodField()
    total_findings = serializers.SerializerMethodField()
    critical_findings = serializers.SerializerMethodField()
    
    class Meta:
        model = PrivacyDetectionProject
        fields = [
            'id', 'name', 'description', 'project_type', 'status',
            'owner', 'owner_name', 'compliance_project', 'compliance_project_name',
            'created_at', 'updated_at', 'scans', 'reports',
            'total_scans', 'completed_scans', 'total_findings', 'critical_findings'
        ]
        read_only_fields = ['owner', 'created_at', 'updated_at']
    
    def get_total_scans(self, obj):
        return obj.scans.count()
    
    def get_completed_scans(self, obj):
        return obj.scans.filter(status='completed').count()
    
    def get_total_findings(self, obj):
        return PrivacyFinding.objects.filter(scan__project=obj).count()
    
    def get_critical_findings(self, obj):
        return PrivacyFinding.objects.filter(
            scan__project=obj, 
            severity='critical',
            status__in=['open', 'in_progress']
        ).count()

class PrivacyDetectionProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyDetectionProject
        fields = ['name', 'description', 'project_type', 'compliance_project']
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

class CookieAnalysisRequestSerializer(serializers.Serializer):
    url = serializers.URLField()
    project_id = serializers.IntegerField(required=False)
    
class PrivacyScanRequestSerializer(serializers.Serializer):
    scan_type = serializers.ChoiceField(choices=[
        ('cookie_analysis', 'Cookie Analysis'),
        ('security_headers', 'Security Headers'),
        ('data_flow', 'Data Flow Analysis'),
        ('code_scan', 'Code Scan'),
        ('mobile_scan', 'Mobile App Scan'),
    ])
    project_id = serializers.IntegerField()
    parameters = serializers.JSONField(required=False, default=dict)

class PIAResultSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    generated_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = PIAResult
        fields = [
            'id', 'user', 'user_name', 'project_name', 'project_type', 'project_url',
            'overall_risk_level', 'risk_score', 'critical_risks', 'high_risks',
            'medium_risks', 'low_risks', 'total_risks', 'total_data_points',
            'recommendations_count', 'full_report', 'used_git_scan', 'used_sast_scan',
            'used_mobile_scan', 'used_security_headers', 'used_cookie_analysis',
            'generated_at', 'generated_at_formatted', 'updated_at'
        ]
        read_only_fields = ['user', 'generated_at', 'updated_at']
    
    def get_generated_at_formatted(self, obj):
        return obj.generated_at.strftime('%B %d, %Y at %I:%M %p')

class DPIAResultSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    generated_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = DPIAResult
        fields = [
            'id', 'user', 'user_name', 'project_name', 'project_type', 'project_url',
            'overall_risk_level', 'risk_score', 'critical_risks', 'high_risks',
            'medium_risks', 'low_risks', 'total_risks', 'total_data_points',
            'pii_categories_found', 'third_party_integrations', 'legal_impact_score',
            'financial_impact_score', 'reputational_impact_score', 'overall_impact_score',
            'gdpr_compliance_score', 'dpdpa_compliance_score', 'hipaa_compliance_score',
            'ccpa_compliance_score', 'overall_compliance_score', 'recommendations_count',
            'mitigation_measures_count', 'full_report', 'used_git_scan', 'used_sast_scan',
            'used_mobile_scan', 'used_security_headers', 'used_cookie_analysis',
            'generated_at', 'generated_at_formatted', 'updated_at'
        ]
        read_only_fields = ['user', 'generated_at', 'updated_at']
    
    def get_generated_at_formatted(self, obj):
        return obj.generated_at.strftime('%B %d, %Y at %I:%M %p')

class RoPAResultSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    generated_at_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = RoPAResult
        fields = [
            'id', 'user', 'user_name', 'project_name', 'project_type', 'project_url',
            'total_processing_activities', 'pii_categories_processed', 'data_subjects_count', 'processing_purposes_count',
            'overall_risk_level', 'risk_score', 'critical_risks', 'high_risks',
            'medium_risks', 'low_risks', 'total_risks', 'legal_impact_score',
            'financial_impact_score', 'reputational_impact_score', 'overall_impact_score',
            'gdpr_compliance_score', 'dpdpa_compliance_score', 'hipaa_compliance_score',
            'ccpa_compliance_score', 'overall_compliance_score', 'mitigation_measures_count',
            'technical_controls_count', 'administrative_controls_count', 'full_report',
            'used_git_scan', 'used_sast_scan', 'used_mobile_scan', 'used_security_headers',
            'used_cookie_analysis', 'generated_at', 'generated_at_formatted', 'updated_at'
        ]
        read_only_fields = ['user', 'generated_at', 'updated_at']
    
    def get_generated_at_formatted(self, obj):
        return obj.generated_at.strftime('%B %d, %Y at %I:%M %p')
