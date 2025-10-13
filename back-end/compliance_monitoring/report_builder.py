# compliance_monitoring/report_builder.py
from django.db.models import Count, Q, Avg
from django.utils import timezone
from collections import defaultdict
from .models import Project, Framework, Clause, SubClause
from auditing.models import AuditorReview, Evidence, Risk, ActionItem
from accounts.models import User, Organization
# from questionnaire.models import Assessment, Answer  # Commented out since models don't exist
import json
from datetime import datetime, timedelta

class ComplianceReportBuilder:
    """
    Comprehensive report builder for compliance assessments across multiple frameworks.
    Extracts and structures all data points needed for professional PDF reports.
    """
    
    def __init__(self, project_id, user=None):
        self.project = Project.objects.get(id=project_id)
        self.user = user
        self.framework = self.project.framework
        
    def build_complete_report_data(self, date_from=None, date_to=None, control_categories=None):
        """
        Build comprehensive report data structure containing all necessary information
        for PDF generation including control assessments, compliance scoring, and analytics.
        """
        
        # Set default date range if not provided
        if not date_to:
            date_to = timezone.now()
        if not date_from:
            date_from = date_to - timedelta(days=365)  # Last year by default
            
        report_data = {
            'metadata': self._get_assessment_metadata(),
            'control_assessment': self._get_control_assessment_data(date_from, date_to, control_categories),
            'compliance_scoring': self._get_compliance_scoring_and_analytics(date_from, date_to),
            'remediation_planning': self._get_remediation_planning_data(),
            'evidence_management': self._get_evidence_management_data(),
            'technical_findings': self._get_technical_findings_data(),
            'stakeholder_data': self._get_stakeholder_data(),
            'risk_assessment': self._get_risk_assessment_data(),
            'report_structure': self._get_report_structure_requirements(),
            'visual_elements': self._prepare_visual_elements_data()
        }
        
        return report_data
    
    def _get_assessment_metadata(self):
        """Extract report metadata and assessment information"""
        return {
            'report_info': {
                'assessment_date': timezone.now().isoformat(),
                'report_generation_timestamp': timezone.now().isoformat(),
                'client_organization_name': self.project.organization.name if self.project.organization else 'Unknown Organization',
                'project_name': self.project.name,
                'project_description': self.project.description,
                'framework_name': self.framework.name,
                'framework_description': self.framework.description,
                'assessment_methodology': f'{self.project.framework.name if self.project.framework else "Compliance Framework"} Controls Assessment',
                'scope_of_assessment': {
                    'project_scope': self.project.description,
                    'framework_scope': self.framework.name,
                    'total_controls': self.framework.clauses.count(),
                    'assessment_period': f"{timezone.now() - timedelta(days=365)} to {timezone.now()}"
                }
            },
            'assessor_info': {
                'primary_assessor': self.user.get_full_name() if self.user else 'System Generated',
                'assessor_email': self.user.email if self.user else '',
                'assessment_team': self._get_assessment_team_info()
            }
        }
    
    def _get_assessment_team_info(self):
        """Get information about the assessment team"""
        team_info = []
        
        # Project owner
        if self.project.owner:
            team_info.append({
                'name': self.project.owner.get_full_name(),
                'role': 'Project Owner',
                'email': self.project.owner.email
            })
        
        # Project members
        for member in self.project.project_members.all():
            team_info.append({
                'name': member.user.get_full_name(),
                'role': f'Project Member ({member.get_permission_level_display()})',
                'email': member.user.email
            })
        
        # Auditors
        if hasattr(self.project, 'project_auditors'):
            for auditor in self.project.project_auditors.all():
                team_info.append({
                    'name': auditor.user.get_full_name(),
                    'role': 'Auditor',
                    'email': auditor.user.email
                })
        
        return team_info
    
    def _get_control_assessment_data(self, date_from, date_to, control_categories=None):
        """Extract detailed control assessment information using same data sources as frontend"""
        
        controls_data = []
        
        # Use project-specific controls instead of all framework controls
        # This matches the frontend data source: /api/projects/${project.id}/controls/
        from compliance_monitoring.models import Clause
        project_controls = Clause.objects.filter(
            framework=self.framework,
            # Add project-specific filtering if you have a relationship
        ).all()
        
        if control_categories:
            # Filter by control categories if specified
            project_controls = project_controls.filter(title__icontains=control_categories)
        
        for clause in project_controls:
            # Get the latest review for this control
            latest_review = AuditorReview.objects.filter(
                control=clause,
                created_at__range=[date_from, date_to]
            ).order_by('-created_at').first()
            
            # Map review status to maturity levels
            maturity_level = self._map_review_status_to_maturity(latest_review.status if latest_review else None)
            
            # Calculate progress based on auditor reviews (like frontend does)
            total_subcontrols = clause.sub_clauses.count() if hasattr(clause, 'sub_clauses') else 0
            
            # Count subcontrols with accepted reviews (implemented)
            subcontrols_completed = 0
            if total_subcontrols > 0:
                for subclause in clause.sub_clauses.all():
                    # Check if this subclause has an accepted review
                    accepted_review = AuditorReview.objects.filter(
                        sub_clause=subclause,
                        status='Accepted'
                    ).exists()
                    if accepted_review:
                        subcontrols_completed += 1
            
            progress = 0
            if total_subcontrols > 0:
                progress = round((subcontrols_completed / total_subcontrols) * 100)
            
            # Determine implementation status like frontend
            implementation_status = "Not Started"
            if progress >= 100:
                implementation_status = "Completed"
            elif progress > 0:
                implementation_status = "In Progress"
            
            control_data = {
                'control_id': clause.clause_number,
                'control_name': clause.title,
                'control_description': clause.description,
                'iso_clause_reference': clause.clause_number,
                'control_category': self._categorize_control(clause.title),
                'maturity_level': maturity_level,
                'implementation_status': implementation_status,
                'progress': progress,
                'subcontrols_completed': subcontrols_completed,
                'total_subcontrols': total_subcontrols,
                'implementation_details': {
                    'current_state_observations': latest_review.evidence if latest_review else 'No assessment completed',
                    'gap_analysis_findings': latest_review.evidence_notes if latest_review else 'Pending assessment',
                    'implementation_stage': self._determine_implementation_stage(maturity_level),
                    'priority_ranking': self._calculate_priority_ranking(maturity_level, clause),
                    'target_completion_date': self._calculate_target_completion_date(maturity_level)
                },
                'sub_controls': self._get_sub_control_data(clause, date_from, date_to),
                'related_evidence': self._get_control_evidence(clause),
                'action_items': self._get_control_action_items(clause),
                'review_history': self._get_control_review_history(clause, date_from, date_to)
            }
            
            controls_data.append(control_data)
        
        return {
            'total_controls_assessed': len(controls_data),
            'controls': controls_data,
            'assessment_summary': self._generate_assessment_summary(controls_data)
        }
    
    def _map_review_status_to_maturity(self, review_status):
        """Map auditor review status to maturity levels"""
        status_mapping = {
            'Accepted': 'Conforms',
            'Rejected': 'Major non-conformity',
            'Pending Updates': 'Minor non-conformity',
            None: 'Cannot be assessed'
        }
        return status_mapping.get(review_status, 'Cannot be assessed')
    
    def _categorize_control(self, control_title):
        """Categorize controls based on their titles"""
        categories = {
            'Information Security Policies': ['policy', 'policies', 'governance'],
            'Access Control': ['access', 'authentication', 'authorization', 'identity'],
            'Asset Management': ['asset', 'inventory', 'classification'],
            'Human Resource Security': ['human', 'resource', 'personnel', 'training'],
            'Physical and Environmental Security': ['physical', 'environmental', 'facility'],
            'Communications and Operations Management': ['communication', 'operations', 'network'],
            'System Acquisition, Development and Maintenance': ['system', 'development', 'maintenance'],
            'Information Security Incident Management': ['incident', 'response', 'breach'],
            'Business Continuity Management': ['continuity', 'recovery', 'backup'],
            'Compliance': ['compliance', 'audit', 'legal', 'regulatory']
        }
        
        control_title_lower = control_title.lower()
        for category, keywords in categories.items():
            if any(keyword in control_title_lower for keyword in keywords):
                return category
        
        return 'Other'
    
    def _determine_implementation_stage(self, maturity_level):
        """Determine implementation stage based on maturity level"""
        stage_mapping = {
            'Major non-conformity': 'Stage 1',
            'Minor non-conformity': 'Stage 2', 
            'Conforms': 'Stage 3',
            'Cannot be assessed': 'Stage 1'
        }
        return stage_mapping.get(maturity_level, 'Stage 1')
    
    def _calculate_priority_ranking(self, maturity_level, clause):
        """Calculate priority ranking based on maturity level and risk factors"""
        priority_scores = {
            'Major non-conformity': 10,
            'Minor non-conformity': 7,
            'Cannot be assessed': 5,
            'Conforms': 1
        }
        
        base_score = priority_scores.get(maturity_level, 5)
        
        # Adjust based on associated risks
        risk_count = Risk.objects.filter(
            project=self.project,
            # Assuming risks can be linked to controls through action items or other means
        ).count()
        
        if risk_count > 0:
            base_score += min(risk_count, 3)  # Cap risk adjustment
        
        return min(base_score, 10)  # Cap at 10
    
    def _calculate_target_completion_date(self, maturity_level):
        """Calculate target completion date based on maturity level"""
        days_mapping = {
            'Major non-conformity': 30,
            'Minor non-conformity': 60,
            'Cannot be assessed': 90,
            'Conforms': 0
        }
        
        days_to_add = days_mapping.get(maturity_level, 90)
        if days_to_add == 0:
            return None
        
        return (timezone.now() + timedelta(days=days_to_add)).date().isoformat()
    
    def _get_sub_control_data(self, clause, date_from, date_to):
        """Get sub-control assessment data"""
        sub_controls = []
        
        for sub_clause in clause.sub_clauses.all():
            latest_review = AuditorReview.objects.filter(
                control=clause,
                sub_clause=sub_clause,
                created_at__range=[date_from, date_to]
            ).order_by('-created_at').first()
            
            sub_controls.append({
                'sub_control_id': f"{clause.clause_number}.{sub_clause.sub_clause_number}",
                'sub_control_name': sub_clause.title,
                'sub_control_description': sub_clause.description,
                'maturity_level': self._map_review_status_to_maturity(latest_review.status if latest_review else None),
                'evidence': latest_review.evidence if latest_review else 'No evidence provided'
            })
        
        return sub_controls
    
    def _get_control_evidence(self, clause):
        """Get evidence associated with a control - matches frontend data structure"""
        evidence_list = []
        
        # Use same filtering as frontend: Evidence.objects.filter(project=self.project)
        # Then check if evidence.clauses includes this control.id
        for evidence in Evidence.objects.filter(project=self.project):
            # Check if this evidence is linked to this control (like frontend does)
            if hasattr(evidence, 'clauses') and clause.id in [c.id for c in evidence.clauses.all()]:
                evidence_list.append({
                    'evidence_name': evidence.evidence_name,
                    'evidence_description': evidence.description,
                    'file_name': evidence.file.name if evidence.file else None,
                    'upload_date': evidence.uploaded_at.isoformat(),
                    'uploaded_by': evidence.created_by.get_full_name() if evidence.created_by else 'Unknown',
                    'evidence_id': evidence.id,
                    'file_size': evidence.file.size if evidence.file else 0,
                    'file_type': self._get_file_type(evidence.file.name if evidence.file else '')
                })
        
        return evidence_list
    
    def _get_file_type(self, filename):
        """Determine file type from filename"""
        if not filename:
            return 'unknown'
        
        filename_lower = filename.lower()
        if any(ext in filename_lower for ext in ['.pdf', '.doc', '.docx']):
            return 'document'
        elif any(ext in filename_lower for ext in ['.png', '.jpg', '.jpeg', '.gif']):
            return 'image'
        elif any(ext in filename_lower for ext in ['.txt', '.log', '.csv']):
            return 'text'
        elif any(ext in filename_lower for ext in ['.xlsx', '.xls']):
            return 'spreadsheet'
        else:
            return 'other'
    
    def _get_control_action_items(self, clause):
        """Get action items related to a control"""
        # This would need to be implemented based on how action items are linked to controls
        # For now, return project-level action items
        action_items = []
        
        for action in ActionItem.objects.filter(project=self.project):
            action_items.append({
                'title': action.title,
                'description': action.description,
                'priority': action.priority,
                'status': action.status,
                'due_date': action.due_date.isoformat() if action.due_date else None,
                'assignee': action.assignee.get_full_name() if action.assignee else 'Unassigned'
            })
        
        return action_items
    
    def _get_control_review_history(self, clause, date_from, date_to):
        """Get review history for a control"""
        reviews = []
        
        for review in AuditorReview.objects.filter(
            control=clause,
            created_at__range=[date_from, date_to]
        ).order_by('-created_at'):
            reviews.append({
                'review_date': review.created_at.isoformat(),
                'reviewer': review.auditor.get_full_name(),
                'status': review.status,
                'conclusion': review.conclusion,
                'evidence_notes': review.evidence_notes
            })
        
        return reviews
    
    def _generate_assessment_summary(self, controls_data):
        """Generate summary statistics for the assessment - matches frontend data structure"""
        total_controls = len(controls_data)
        
        # Count by implementation status (like frontend does)
        status_counts = defaultdict(int)
        category_counts = defaultdict(int)
        total_subcontrols = 0
        completed_subcontrols = 0
        
        for control in controls_data:
            # Use implementation_status instead of maturity_level
            status = control.get('implementation_status', 'Not Started')
            status_counts[status] += 1
            category_counts[control['control_category']] += 1
            
            # Calculate subcontrols totals from the control data
            total_subcontrols += control.get('total_subcontrols', 0)
            completed_subcontrols += control.get('subcontrols_completed', 0)
        
        return {
            'total_controls': total_controls,
            'total_subcontrols': total_subcontrols,
            'completed_subcontrols': completed_subcontrols,
            'status_distribution': dict(status_counts),
            'category_distribution': dict(category_counts),
            'compliance_percentage': self._calculate_compliance_percentage_from_subcontrols(completed_subcontrols, total_subcontrols),
            'controls_completed': status_counts.get('Completed', 0),
            'controls_in_progress': status_counts.get('In Progress', 0),
            'controls_not_started': status_counts.get('Not Started', 0)
        }
    
    def _calculate_compliance_percentage(self, maturity_counts, total_controls):
        """Calculate overall compliance percentage"""
        if total_controls == 0:
            return 0
        
        conforming_controls = maturity_counts.get('Conforms', 0)
        return round((conforming_controls / total_controls) * 100, 2)
    
    def _calculate_compliance_percentage_from_subcontrols(self, completed_subcontrols, total_subcontrols):
        """Calculate compliance percentage from subcontrols completion"""
        if total_subcontrols == 0:
            return 0
        
        return round((completed_subcontrols / total_subcontrols) * 100, 2)
    
    def _get_compliance_scoring_and_analytics(self, date_from, date_to):
        """Get compliance scoring and analytics data"""
        
        # Get all reviews in the date range
        reviews = AuditorReview.objects.filter(
            control__framework=self.framework,
            created_at__range=[date_from, date_to]
        )
        
        # Calculate maturity metrics
        maturity_counts = reviews.values('status').annotate(count=Count('status'))
        maturity_metrics = {item['status']: item['count'] for item in maturity_counts}
        
        # Calculate compliance scores by category
        category_scores = {}
        for clause in self.framework.clauses.all():
            category = self._categorize_control(clause.title)
            if category not in category_scores:
                category_scores[category] = {'total': 0, 'conforming': 0}
            
            category_scores[category]['total'] += 1
            
            latest_review = reviews.filter(control=clause).order_by('-created_at').first()
            if latest_review and latest_review.status == 'Accepted':
                category_scores[category]['conforming'] += 1
        
        # Calculate percentages
        category_percentages = {}
        for category, scores in category_scores.items():
            if scores['total'] > 0:
                category_percentages[category] = round((scores['conforming'] / scores['total']) * 100, 2)
            else:
                category_percentages[category] = 0
        
        return {
            'maturity_metrics': {
                'major_non_conformity': maturity_metrics.get('Rejected', 0),
                'minor_non_conformity': maturity_metrics.get('Pending Updates', 0),
                'conforms': maturity_metrics.get('Accepted', 0),
                'cannot_be_assessed': self.framework.clauses.count() - sum(maturity_metrics.values())
            },
            'compliance_scores_by_category': category_percentages,
            'overall_compliance_percentage': self._calculate_overall_compliance(),
            'trend_data': self._get_compliance_trend_data(date_from, date_to),
            'gap_closure_progress': self._get_gap_closure_progress()
        }
    
    def _calculate_overall_compliance(self):
        """Calculate overall compliance percentage using same method as frontend"""
        # Use project-specific controls instead of all framework controls
        from compliance_monitoring.models import Clause
        project_controls = Clause.objects.filter(framework=self.framework).all()
        total_controls = project_controls.count()
        
        if total_controls == 0:
            return 0
        
        # Calculate based on subcontrols completion like frontend does
        total_subcontrols = 0
        completed_subcontrols = 0
        
        for control in project_controls:
            if hasattr(control, 'sub_clauses'):
                control_subcontrols = control.sub_clauses.count()
                
                # Count subcontrols with accepted reviews (implemented)
                control_completed = 0
                for subclause in control.sub_clauses.all():
                    accepted_review = AuditorReview.objects.filter(
                        sub_clause=subclause,
                        status='Accepted'
                    ).exists()
                    if accepted_review:
                        control_completed += 1
                
                total_subcontrols += control_subcontrols
                completed_subcontrols += control_completed
        
        if total_subcontrols == 0:
            return 0
        
        return round((completed_subcontrols / total_subcontrols) * 100, 2)
    
    def _get_compliance_trend_data(self, date_from, date_to):
        """Get compliance trend data over time"""
        # This would implement trend analysis over multiple assessment periods
        # For now, return basic monthly breakdown
        trend_data = []
        
        current_date = date_from
        while current_date <= date_to:
            month_end = min(current_date.replace(day=28) + timedelta(days=4), date_to)
            
            month_reviews = AuditorReview.objects.filter(
                control__framework=self.framework,
                created_at__range=[current_date, month_end]
            )
            
            total_month_reviews = month_reviews.count()
            conforming_month_reviews = month_reviews.filter(status='Accepted').count()
            
            compliance_rate = 0
            if total_month_reviews > 0:
                compliance_rate = round((conforming_month_reviews / total_month_reviews) * 100, 2)
            
            trend_data.append({
                'period': current_date.strftime('%Y-%m'),
                'compliance_rate': compliance_rate,
                'total_assessments': total_month_reviews
            })
            
            # Move to next month
            current_date = month_end + timedelta(days=1)
        
        return trend_data
    
    def _get_gap_closure_progress(self):
        """Get gap closure progress tracking"""
        total_gaps = ActionItem.objects.filter(project=self.project).count()
        closed_gaps = ActionItem.objects.filter(project=self.project, status='Approved').count()
        
        progress_percentage = 0
        if total_gaps > 0:
            progress_percentage = round((closed_gaps / total_gaps) * 100, 2)
        
        return {
            'total_gaps_identified': total_gaps,
            'gaps_closed': closed_gaps,
            'gaps_remaining': total_gaps - closed_gaps,
            'progress_percentage': progress_percentage
        }
    
    def _get_remediation_planning_data(self):
        """Get remediation planning and action item data"""
        action_items = ActionItem.objects.filter(project=self.project)
        
        action_items_data = []
        for item in action_items:
            action_items_data.append({
                'title': item.title,
                'description': item.description,
                'type': item.type,
                'priority': item.priority,
                'status': item.status,
                'category': item.category,
                'assigned_owner': item.assignee.get_full_name() if item.assignee else 'Unassigned',
                'requester': item.requester.get_full_name() if item.requester else 'Unknown',
                'due_date': item.due_date.isoformat() if item.due_date else None,
                'additional_details': item.details
            })
        
        # PDCA cycle activities (this would need to be implemented based on your workflow)
        pdca_activities = {
            'plan_stage': self._get_pdca_plan_activities(),
            'do_stage': self._get_pdca_do_activities(),
            'check_stage': self._get_pdca_check_activities(),
            'act_stage': self._get_pdca_act_activities()
        }
        
        return {
            'action_items': action_items_data,
            'action_items_summary': {
                'total_items': len(action_items_data),
                'by_status': self._summarize_by_field(action_items_data, 'status'),
                'by_priority': self._summarize_by_field(action_items_data, 'priority'),
                'by_category': self._summarize_by_field(action_items_data, 'category')
            },
            'pdca_cycle_activities': pdca_activities
        }
    
    def _get_pdca_plan_activities(self):
        """Get Plan stage activities"""
        # This would be implemented based on your specific PDCA workflow
        return {
            'planning_activities': ActionItem.objects.filter(
                project=self.project,
                category='Other',
                type__icontains='plan'
            ).count(),
            'status': 'In Progress'
        }
    
    def _get_pdca_do_activities(self):
        """Get Do stage activities"""
        return {
            'implementation_activities': ActionItem.objects.filter(
                project=self.project,
                status='Required'
            ).count(),
            'status': 'In Progress'
        }
    
    def _get_pdca_check_activities(self):
        """Get Check stage activities"""
        return {
            'monitoring_activities': AuditorReview.objects.filter(
                control__framework=self.framework
            ).count(),
            'status': 'Ongoing'
        }
    
    def _get_pdca_act_activities(self):
        """Get Act stage activities"""
        return {
            'improvement_activities': ActionItem.objects.filter(
                project=self.project,
                status='Approved'
            ).count(),
            'status': 'Completed'
        }
    
    def _summarize_by_field(self, data_list, field_name):
        """Summarize data by a specific field"""
        summary = defaultdict(int)
        for item in data_list:
            summary[item.get(field_name, 'Unknown')] += 1
        return dict(summary)
    
    def _get_evidence_management_data(self):
        """Get evidence management and documentation data"""
        evidence_records = Evidence.objects.filter(project=self.project)
        
        evidence_data = []
        for evidence in evidence_records:
            evidence_data.append({
                'evidence_name': evidence.evidence_name,
                'description': evidence.description,
                'evidence_type': self._determine_evidence_type(evidence),
                'associated_controls': [clause.clause_number for clause in evidence.clauses.all()],
                'upload_date': evidence.uploaded_at.isoformat(),
                'created_by': evidence.created_by.get_full_name() if evidence.created_by else 'Unknown',
                'file_path': evidence.file.name if evidence.file else None,
                'validation_status': 'Validated' if evidence.file else 'Pending'
            })
        
        return {
            'evidence_records': evidence_data,
            'evidence_summary': {
                'total_evidence_items': len(evidence_data),
                'by_type': self._summarize_evidence_by_type(evidence_data),
                'validation_status': self._summarize_by_field(evidence_data, 'validation_status')
            },
            'document_tracking': self._get_document_tracking_data()
        }
    
    def _determine_evidence_type(self, evidence):
        """Determine evidence type based on file extension or content"""
        if evidence.file:
            file_name = evidence.file.name.lower()
            if any(ext in file_name for ext in ['.pdf', '.doc', '.docx']):
                return 'policy'
            elif any(ext in file_name for ext in ['.png', '.jpg', '.jpeg']):
                return 'screenshot'
            elif any(ext in file_name for ext in ['.txt', '.log']):
                return 'configuration'
            else:
                return 'procedure'
        return 'other'
    
    def _summarize_evidence_by_type(self, evidence_data):
        """Summarize evidence by type"""
        return self._summarize_by_field(evidence_data, 'evidence_type')
    
    def _get_document_tracking_data(self):
        """Get document tracking information"""
        # This would track policy documents, procedures, etc.
        # For now, return basic evidence document info
        return {
            'total_documents': Evidence.objects.filter(project=self.project).count(),
            'documents_with_files': Evidence.objects.filter(project=self.project, file__isnull=False).count(),
            'recent_uploads': Evidence.objects.filter(
                project=self.project,
                uploaded_at__gte=timezone.now() - timedelta(days=30)
            ).count()
        }
    
    def _get_technical_findings_data(self):
        """Get technical findings and technology inventory"""
        # This would integrate with privacy_detection and other technical modules
        return {
            'technology_inventory': {
                'total_assets': 'To be integrated with asset management',
                'security_tools': 'To be integrated with tool inventory',
                'network_architecture': 'To be integrated with network discovery'
            },
            'vulnerability_data': {
                'technical_vulnerabilities': 'To be integrated with vulnerability scanner',
                'security_weaknesses': 'To be integrated with security assessment',
                'configuration_compliance': 'To be integrated with configuration management'
            },
            'tool_recommendations': self._get_tool_recommendations()
        }
    
    def _get_tool_recommendations(self):
        """Get security tool recommendations"""
        return [
            {
                'category': 'Antivirus',
                'recommended_tools': ['Windows Defender', 'Bitdefender', 'Kaspersky'],
                'current_status': 'Assessment Required'
            },
            {
                'category': 'Vulnerability Scanner',
                'recommended_tools': ['Nessus', 'OpenVAS', 'Qualys'],
                'current_status': 'Assessment Required'
            },
            {
                'category': 'Password Manager',
                'recommended_tools': ['1Password', 'Bitwarden', 'LastPass'],
                'current_status': 'Assessment Required'
            }
        ]
    
    def _get_stakeholder_data(self):
        """Get stakeholder information - matches frontend data structure"""
        stakeholders = []
        
        # Add project owner
        if self.project.owner:
            stakeholders.append({
                'name': self.project.owner.get_full_name(),
                'position': 'Project Owner',
                'department': 'Management',
                'email': self.project.owner.email,
                'role_in_project': 'Project Owner',
                'user_id': self.project.owner.id,
                'is_owner': True
            })
        
        # Add project members - use same data source as frontend
        for member in self.project.project_members.all():
            stakeholders.append({
                'name': member.user.get_full_name(),
                'position': member.get_permission_level_display(),
                'department': 'Various',
                'email': member.user.email,
                'role_in_project': 'Project Member',
                'user_id': member.user.id,
                'permission_level': member.permission_level,
                'is_owner': False
            })
        
        # Add auditors - use same data source as frontend
        if hasattr(self.project, 'project_auditors'):
            for auditor in self.project.project_auditors.all():
                stakeholders.append({
                    'name': auditor.user.get_full_name(),
                    'position': 'Auditor',
                    'department': 'Audit',
                    'email': auditor.user.email,
                    'role_in_project': 'Auditor',
                    'user_id': auditor.user.id,
                    'is_owner': False
                })
        
        return {
            'stakeholders': stakeholders,
            'key_stakeholders_interviewed': len(stakeholders),
            'total_team_members': len(stakeholders),
            'project_owner': self.project.owner.get_full_name() if self.project.owner else 'Unassigned',
            'responsible_parties': self._get_responsible_parties_by_control()
        }
    
    def _get_responsible_parties_by_control(self):
        """Get responsible parties for each control"""
        # This would map controls to responsible parties
        # For now, return project-level assignments
        return {
            'default_responsible_party': self.project.owner.get_full_name() if self.project.owner else 'Unassigned'
        }
    
    def _get_risk_assessment_data(self):
        """Get risk assessment data"""
        risks = Risk.objects.filter(project=self.project)
        
        risk_data = []
        for risk in risks:
            risk_data.append({
                'risk_title': risk.title,
                'risk_description': risk.description,
                'risk_category': risk.risk_category,
                'impact': risk.impact,
                'likelihood': risk.likelihood,
                'risk_rating': risk.risk_rating,
                'status': risk.status,
                'owner': risk.owner.get_full_name() if risk.owner else 'Unassigned',
                'target_mitigation_date': risk.target_mitigation_date.isoformat() if risk.target_mitigation_date else None,
                'mitigation_strategy': risk.mitigation_strategy,
                'identified_date': risk.identified_at.isoformat()
            })
        
        return {
            'risks': risk_data,
            'risk_summary': {
                'total_risks': len(risk_data),
                'by_category': self._summarize_by_field(risk_data, 'risk_category'),
                'by_impact': self._summarize_by_field(risk_data, 'impact'),
                'by_status': self._summarize_by_field(risk_data, 'status')
            },
            'risk_treatment_status': self._get_risk_treatment_status(risk_data)
        }
    
    def _get_risk_treatment_status(self, risk_data):
        """Get risk treatment status summary"""
        treatment_status = {
            'risks_accepted': len([r for r in risk_data if r['status'] == 'closed']),
            'risks_mitigated': len([r for r in risk_data if r['status'] == 'mitigated']),
            'risks_in_treatment': len([r for r in risk_data if r['status'] == 'in_progress']),
            'risks_open': len([r for r in risk_data if r['status'] == 'open'])
        }
        
        return treatment_status
    
    def _get_report_structure_requirements(self):
        """Get report structure requirements for PDF generation"""
        return {
            'executive_components': {
                'table_of_contents': True,
                'executive_summary': True,
                'methodology_overview': True,
                'key_findings_summary': True,
                'visual_radar_chart': True
            },
            'detailed_sections': {
                'maturity_level_matrix': True,
                'roadmap_table': True,
                'stage_based_implementation_plan': True,
                'pdca_cycle_activities': True,
                'annex_a_controls_breakdown': True,
                'recommendations_by_control_family': True
            },
            'visual_elements': {
                'radar_spider_chart': True,
                'color_coded_tables': True,
                'status_indicators': True,
                'page_headers_footers': True
            }
        }
    
    def _prepare_visual_elements_data(self):
        """Prepare data for visual elements like charts and graphs"""
        
        # Data for radar/spider chart
        categories = {}
        for clause in self.framework.clauses.all():
            category = self._categorize_control(clause.title)
            if category not in categories:
                categories[category] = {'total': 0, 'conforming': 0}
            
            categories[category]['total'] += 1
            
            # Check if control conforms
            latest_review = AuditorReview.objects.filter(control=clause).order_by('-created_at').first()
            if latest_review and latest_review.status == 'Accepted':
                categories[category]['conforming'] += 1
        
        radar_data = []
        for category, counts in categories.items():
            percentage = 0
            if counts['total'] > 0:
                percentage = round((counts['conforming'] / counts['total']) * 100, 2)
            
            radar_data.append({
                'category': category,
                'score': percentage,
                'max_score': 100
            })
        
        return {
            'radar_chart_data': radar_data,
            'color_scheme': {
                'major_non_conformity': '#FF4444',  # Red
                'minor_non_conformity': '#FFA500',  # Orange
                'conforms': '#00AA00',              # Green
                'cannot_be_assessed': '#CCCCCC'    # Gray
            },
            'chart_configurations': {
                'radar_chart': {
                    'title': 'Compliance Maturity by Control Category',
                    'scale_max': 100,
                    'scale_min': 0
                }
            }
        }
