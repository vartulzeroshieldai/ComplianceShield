from django.contrib import admin
from .models import PrivacyDetectionProject, PrivacyScan, PrivacyFinding, PrivacyReport, PIAResult, DPIAResult, RoPAResult

# Register your models here.
admin.site.register(PrivacyDetectionProject)
admin.site.register(PrivacyScan)
admin.site.register(PrivacyFinding)
admin.site.register(PrivacyReport)

@admin.register(PIAResult)
class PIAResultAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'overall_risk_level', 'risk_score', 'total_risks', 'user', 'generated_at')
    list_filter = ('overall_risk_level', 'generated_at', 'used_git_scan', 'used_mobile_scan')
    search_fields = ('project_name', 'project_url')
    readonly_fields = ('generated_at', 'updated_at')
    fieldsets = (
        ('Project Information', {
            'fields': ('user', 'project_name', 'project_type', 'project_url')
        }),
        ('Risk Summary', {
            'fields': ('overall_risk_level', 'risk_score', 'total_risks', 
                      'critical_risks', 'high_risks', 'medium_risks', 'low_risks')
        }),
        ('Analysis Details', {
            'fields': ('total_data_points', 'recommendations_count')
        }),
        ('Scan Sources', {
            'fields': ('used_git_scan', 'used_sast_scan', 'used_mobile_scan', 
                      'used_security_headers', 'used_cookie_analysis')
        }),
        ('Timestamps', {
            'fields': ('generated_at', 'updated_at')
        }),
    )

@admin.register(DPIAResult)
class DPIAResultAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'overall_risk_level', 'risk_score', 'overall_impact_score', 'overall_compliance_score', 'user', 'generated_at')
    list_filter = ('overall_risk_level', 'generated_at', 'used_git_scan', 'used_mobile_scan', 'project_type')
    search_fields = ('project_name', 'project_url')
    readonly_fields = ('generated_at', 'updated_at')
    fieldsets = (
        ('Project Information', {
            'fields': ('user', 'project_name', 'project_type', 'project_url')
        }),
        ('Risk Summary', {
            'fields': ('overall_risk_level', 'risk_score', 'total_risks', 
                      'critical_risks', 'high_risks', 'medium_risks', 'low_risks')
        }),
        ('Data Inventory', {
            'fields': ('total_data_points', 'pii_categories_found', 'third_party_integrations')
        }),
        ('Impact Analysis', {
            'fields': ('legal_impact_score', 'financial_impact_score', 'reputational_impact_score', 'overall_impact_score')
        }),
        ('Compliance Check', {
            'fields': ('gdpr_compliance_score', 'dpdpa_compliance_score', 'hipaa_compliance_score', 'ccpa_compliance_score', 'overall_compliance_score')
        }),
        ('Recommendations', {
            'fields': ('recommendations_count', 'mitigation_measures_count')
        }),
        ('Scan Sources', {
            'fields': ('used_git_scan', 'used_sast_scan', 'used_mobile_scan', 
                      'used_security_headers', 'used_cookie_analysis')
        }),
        ('Timestamps', {
            'fields': ('generated_at', 'updated_at')
        }),
    )

@admin.register(RoPAResult)
class RoPAResultAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'overall_risk_level', 'risk_score', 'total_processing_activities', 'overall_compliance_score', 'user', 'generated_at')
    list_filter = ('overall_risk_level', 'generated_at', 'used_git_scan', 'used_mobile_scan', 'project_type')
    search_fields = ('project_name', 'project_url')
    readonly_fields = ('generated_at', 'updated_at')
    fieldsets = (
        ('Project Information', {
            'fields': ('user', 'project_name', 'project_type', 'project_url')
        }),
        ('Processing Activities', {
            'fields': ('total_processing_activities', 'pii_categories_processed', 'data_subjects_count', 'processing_purposes_count')
        }),
        ('Risk Summary', {
            'fields': ('overall_risk_level', 'risk_score', 'total_risks', 
                      'critical_risks', 'high_risks', 'medium_risks', 'low_risks')
        }),
        ('Impact Analysis', {
            'fields': ('legal_impact_score', 'financial_impact_score', 'reputational_impact_score', 'overall_impact_score')
        }),
        ('Compliance Check', {
            'fields': ('gdpr_compliance_score', 'dpdpa_compliance_score', 'hipaa_compliance_score', 'ccpa_compliance_score', 'overall_compliance_score')
        }),
        ('Mitigation Plan', {
            'fields': ('mitigation_measures_count', 'technical_controls_count', 'administrative_controls_count')
        }),
        ('Scan Sources', {
            'fields': ('used_git_scan', 'used_sast_scan', 'used_mobile_scan', 
                      'used_security_headers', 'used_cookie_analysis')
        }),
        ('Timestamps', {
            'fields': ('generated_at', 'updated_at')
        }),
    )
