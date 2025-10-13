from django.db import models
from django.conf import settings
from compliance_monitoring.models import Project

class PrivacyDetectionProject(models.Model):
    """Model for privacy detection projects"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=50, choices=[
        ('web', 'Web Application'),
        ('mobile', 'Mobile Application'),
        ('desktop', 'Desktop Application'),
        ('api', 'API Service'),
    ])
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    compliance_project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"PrivacyDetection: {self.name} - {self.project_type} - {self.status}"

class PrivacyScan(models.Model):
    """Model for individual privacy scans"""
    project = models.ForeignKey(PrivacyDetectionProject, on_delete=models.CASCADE, related_name='scans')
    scan_type = models.CharField(max_length=50, choices=[
        ('cookie_analysis', 'Cookie Analysis'),
        ('security_headers', 'Security Headers'),
        ('data_flow', 'Data Flow Analysis'),
        ('code_scan', 'Code Scan'),
        ('mobile_scan', 'Mobile App Scan'),
    ])
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ], default='pending')
    results = models.JSONField(default=dict, blank=True)
    findings_count = models.IntegerField(default=0)
    risk_level = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ], default='low')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Scan: {self.project.name} - {self.scan_type} - {self.status}"

class PrivacyFinding(models.Model):
    """Model for individual privacy findings"""
    scan = models.ForeignKey(PrivacyScan, on_delete=models.CASCADE, related_name='findings')
    finding_type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=[
        ('info', 'Info'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ])
    status = models.CharField(max_length=20, choices=[
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('false_positive', 'False Positive'),
    ], default='open')
    recommendation = models.TextField(blank=True)
    file_path = models.CharField(max_length=500, blank=True)
    line_number = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Finding: {self.title} - {self.severity}"

class PrivacyReport(models.Model):
    """Model for privacy compliance reports"""
    project = models.ForeignKey(PrivacyDetectionProject, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=50, choices=[
        ('pia', 'Privacy Impact Assessment'),
        ('dpia', 'Data Protection Impact Assessment'),
        ('ropa', 'Record of Processing Activities'),
        ('compliance', 'Compliance Report'),
    ])
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('published', 'Published'),
    ], default='draft')
    content = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Report: {self.project.name} - {self.report_type} - {self.status}"

class PIAResult(models.Model):
    """Model for Privacy Impact Assessment results"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pia_results')
    project_name = models.CharField(max_length=255, blank=True, help_text="Name of the project being assessed")
    project_type = models.CharField(max_length=50, blank=True)
    project_url = models.CharField(max_length=500, blank=True)
    privacy_project = models.ForeignKey(PrivacyDetectionProject, on_delete=models.SET_NULL, null=True, blank=True, related_name='pia_results', help_text="Related privacy detection project")
    
    # Risk Summary
    overall_risk_level = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ])
    risk_score = models.FloatField()  # Out of 100
    
    # Risk Counts
    critical_risks = models.IntegerField(default=0)
    high_risks = models.IntegerField(default=0)
    medium_risks = models.IntegerField(default=0)
    low_risks = models.IntegerField(default=0)
    total_risks = models.IntegerField(default=0)
    
    # Data Inventory
    total_data_points = models.IntegerField(default=0)
    
    # Recommendations
    recommendations_count = models.IntegerField(default=0)
    
    # Full PIA Report (JSON)
    full_report = models.JSONField(default=dict)
    
    # Scan Sources Used
    used_git_scan = models.BooleanField(default=False)
    used_sast_scan = models.BooleanField(default=False)
    used_mobile_scan = models.BooleanField(default=False)
    used_security_headers = models.BooleanField(default=False)
    used_cookie_analysis = models.BooleanField(default=False)
    
    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name = 'PIA Result'
        verbose_name_plural = 'PIA Results'
    
    def get_project_name(self):
        """Get the project name with fallback logic"""
        if self.project_name and self.project_name.strip():
            return self.project_name.strip()
        elif self.privacy_project:
            return self.privacy_project.name
        else:
            return "Unknown Project"
    
    def save(self, *args, **kwargs):
        """Override save to auto-populate project_name from privacy_project"""
        if not self.project_name and self.privacy_project:
            self.project_name = self.privacy_project.name
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"PIA: {self.get_project_name()} - {self.overall_risk_level} ({self.risk_score}/100) - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"

class DPIAResult(models.Model):
    """Model for Data Protection Impact Assessment results"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='dpia_results')
    project_name = models.CharField(max_length=255, blank=True, help_text="Name of the project being assessed")
    project_type = models.CharField(max_length=50, blank=True)
    project_url = models.CharField(max_length=500, blank=True)
    privacy_project = models.ForeignKey(PrivacyDetectionProject, on_delete=models.SET_NULL, null=True, blank=True, related_name='dpia_results', help_text="Related privacy detection project")
    
    # Risk Summary
    overall_risk_level = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ])
    risk_score = models.FloatField()  # Out of 100
    
    # Risk Counts
    critical_risks = models.IntegerField(default=0)
    high_risks = models.IntegerField(default=0)
    medium_risks = models.IntegerField(default=0)
    low_risks = models.IntegerField(default=0)
    total_risks = models.IntegerField(default=0)
    
    # Data Inventory
    total_data_points = models.IntegerField(default=0)
    pii_categories_found = models.IntegerField(default=0)
    third_party_integrations = models.IntegerField(default=0)
    
    # Impact Analysis
    legal_impact_score = models.FloatField(default=0.0)  # Out of 100
    financial_impact_score = models.FloatField(default=0.0)  # Out of 100
    reputational_impact_score = models.FloatField(default=0.0)  # Out of 100
    overall_impact_score = models.FloatField(default=0.0)  # Out of 100
    
    # Compliance Check
    gdpr_compliance_score = models.FloatField(default=0.0)  # Out of 100
    dpdpa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    hipaa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    ccpa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    overall_compliance_score = models.FloatField(default=0.0)  # Out of 100
    
    # Recommendations
    recommendations_count = models.IntegerField(default=0)
    mitigation_measures_count = models.IntegerField(default=0)
    
    # Full DPIA Report (JSON)
    full_report = models.JSONField(default=dict)
    
    # Scan Sources Used
    used_git_scan = models.BooleanField(default=False)
    used_sast_scan = models.BooleanField(default=False)
    used_mobile_scan = models.BooleanField(default=False)
    used_security_headers = models.BooleanField(default=False)
    used_cookie_analysis = models.BooleanField(default=False)
    
    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name = 'DPIA Result'
        verbose_name_plural = 'DPIA Results'
    
    def get_project_name(self):
        """Get the project name with fallback logic"""
        if self.project_name and self.project_name.strip():
            return self.project_name.strip()
        elif self.privacy_project:
            return self.privacy_project.name
        else:
            return "Unknown Project"
    
    def save(self, *args, **kwargs):
        """Override save to auto-populate project_name from privacy_project"""
        if not self.project_name and self.privacy_project:
            self.project_name = self.privacy_project.name
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"DPIA: {self.get_project_name()} - {self.overall_risk_level} ({self.risk_score}/100) - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"

class RoPAResult(models.Model):
    """Model for Records of Processing Activities (RoPA) results"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ropa_results')
    project_name = models.CharField(max_length=255, blank=True, help_text="Name of the project being assessed")
    project_type = models.CharField(max_length=50, blank=True)
    project_url = models.CharField(max_length=500, blank=True)
    privacy_project = models.ForeignKey(PrivacyDetectionProject, on_delete=models.SET_NULL, null=True, blank=True, related_name='ropa_results', help_text="Related privacy detection project")
    
    # Processing Activities Summary
    total_processing_activities = models.IntegerField(default=0)
    pii_categories_processed = models.IntegerField(default=0)
    data_subjects_count = models.IntegerField(default=0)
    processing_purposes_count = models.IntegerField(default=0)
    
    # Risk Assessment
    overall_risk_level = models.CharField(max_length=20, choices=[
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ])
    risk_score = models.FloatField()  # Out of 100
    
    # Risk Counts
    critical_risks = models.IntegerField(default=0)
    high_risks = models.IntegerField(default=0)
    medium_risks = models.IntegerField(default=0)
    low_risks = models.IntegerField(default=0)
    total_risks = models.IntegerField(default=0)
    
    # Impact Analysis
    legal_impact_score = models.FloatField(default=0.0)  # Out of 100
    financial_impact_score = models.FloatField(default=0.0)  # Out of 100
    reputational_impact_score = models.FloatField(default=0.0)  # Out of 100
    overall_impact_score = models.FloatField(default=0.0)  # Out of 100
    
    # Compliance Check
    gdpr_compliance_score = models.FloatField(default=0.0)  # Out of 100
    dpdpa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    hipaa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    ccpa_compliance_score = models.FloatField(default=0.0)  # Out of 100
    overall_compliance_score = models.FloatField(default=0.0)  # Out of 100
    
    # Mitigation Plan
    mitigation_measures_count = models.IntegerField(default=0)
    technical_controls_count = models.IntegerField(default=0)
    administrative_controls_count = models.IntegerField(default=0)
    
    # Full RoPA Report (JSON)
    full_report = models.JSONField(default=dict)
    
    # Scan Sources Used
    used_git_scan = models.BooleanField(default=False)
    used_sast_scan = models.BooleanField(default=False)
    used_mobile_scan = models.BooleanField(default=False)
    used_security_headers = models.BooleanField(default=False)
    used_cookie_analysis = models.BooleanField(default=False)
    
    # Timestamps
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name = 'RoPA Result'
        verbose_name_plural = 'RoPA Results'
    
    def get_project_name(self):
        """Get the project name with fallback logic"""
        if self.project_name and self.project_name.strip():
            return self.project_name.strip()
        elif self.privacy_project:
            return self.privacy_project.name
        else:
            return "Unknown Project"
    
    def save(self, *args, **kwargs):
        """Override save to auto-populate project_name from privacy_project"""
        if not self.project_name and self.privacy_project:
            self.project_name = self.privacy_project.name
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"RoPA: {self.get_project_name()} - {self.overall_risk_level} ({self.risk_score}/100) - {self.generated_at.strftime('%Y-%m-%d %H:%M')}"