# compliance_monitoring/pdf_generator.py
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus import Image as ReportLabImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.spider import SpiderChart
from reportlab.graphics import renderPDF
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.backends.backend_agg import FigureCanvasAgg
import numpy as np
import base64
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class CompliancePDFGenerator:
    """
    Professional PDF report generator for compliance assessments across multiple frameworks.
    Generates comprehensive reports with charts, tables, and structured content.
    """
    
    def __init__(self, report_data, project, user, report_title=None, company_logo=None, include_sections=None):
        self.report_data = report_data
        self.project = project
        self.user = user
        self.report_title = report_title or f"{project.name} - Compliance Assessment Report"
        self.company_logo = company_logo
        self.include_sections = include_sections or {}
        
        # Initialize styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
        # Color scheme
        self.colors = {
            'primary': colors.Color(0.2, 0.4, 0.6),      # Blue
            'secondary': colors.Color(0.1, 0.5, 0.5),    # Teal
            'success': colors.Color(0.2, 0.7, 0.2),      # Green
            'warning': colors.Color(1.0, 0.6, 0.0),      # Orange
            'danger': colors.Color(0.8, 0.2, 0.2),       # Red
            'muted': colors.Color(0.5, 0.5, 0.5),        # Gray
            'light_gray': colors.Color(0.95, 0.95, 0.95) # Light Gray
        }
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the report"""
        
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            fontSize=24,
            spaceAfter=30,
            spaceBefore=0,
            alignment=TA_CENTER,
            textColor=colors.Color(0.2, 0.4, 0.6),
            fontName='Helvetica-Bold',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=28
        ))
        
        # Heading 1 style - FIXED: Increased spacing
        self.styles.add(ParagraphStyle(
            name='CustomHeading1',
            fontSize=18,
            spaceAfter=20,
            spaceBefore=50,  # CHANGED: Increased from 30 to 50
            textColor=colors.Color(0.2, 0.4, 0.6),
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=22  # CHANGED: Increased from 20 to 22
        ))
        
        # Heading 2 style - FIXED: Increased spacing
        self.styles.add(ParagraphStyle(
            name='CustomHeading2',
            fontSize=14,
            spaceAfter=15,
            spaceBefore=35,  # CHANGED: Increased from 20 to 35
            textColor=colors.Color(0.1, 0.5, 0.5),
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=18  # CHANGED: Increased from 16 to 18
        ))
        
        # Body styles
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            fontSize=10,
            spaceAfter=6,
            spaceBefore=0,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=12
        ))
        
        # Table styles
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            fontSize=9,
            spaceAfter=0,
            spaceBefore=0,
            textColor=colors.white,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='TableCell',
            fontSize=8,
            spaceAfter=0,
            spaceBefore=0,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=9
        ))
        
        # Executive summary style
        self.styles.add(ParagraphStyle(
            name='ExecutiveSummary',
            fontSize=11,
            spaceAfter=10,
            spaceBefore=0,
            alignment=TA_LEFT,
            fontName='Helvetica',
            leftIndent=0,
            rightIndent=0,
            borderWidth=0,
            borderPadding=0,
            leading=13
        ))
    
    def generate_pdf(self):
        """Generate the complete PDF report"""
        buffer = BytesIO()
        
        # Create document - FIXED: Increased topMargin
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=90,  # CHANGED: Increased from 72 to 90
            bottomMargin=72
        )
        
        # Build story (content)
        story = []
        
        # Add cover page
        story.extend(self._create_cover_page())
        story.append(PageBreak())
        
        # Add table of contents
        story.extend(self._create_table_of_contents())
        story.append(PageBreak())
        
        # Add executive summary
        if self.include_sections.get('executive_summary', True):
            story.extend(self._create_executive_summary())
            story.append(PageBreak())
        
        # Add methodology section
        story.extend(self._create_methodology_section())
        story.append(PageBreak())
        
        # Add control assessment details
        if self.include_sections.get('control_details', True):
            story.extend(self._create_control_assessment_section())
            story.append(PageBreak())
        
        # Add compliance scoring
        if self.include_sections.get('compliance_scoring', True):
            story.extend(self._create_compliance_scoring_section())
            story.append(PageBreak())
        
        # Add risk assessment
        if self.include_sections.get('risk_assessment', True):
            story.extend(self._create_risk_assessment_section())
            story.append(PageBreak())
        
        # Add remediation planning
        if self.include_sections.get('remediation_plan', True):
            story.extend(self._create_remediation_planning_section())
            story.append(PageBreak())
        
        # Add evidence management
        if self.include_sections.get('evidence_management', True):
            story.extend(self._create_evidence_management_section())
            story.append(PageBreak())
        
        # Add technical findings
        if self.include_sections.get('technical_findings', True):
            story.extend(self._create_technical_findings_section())
            story.append(PageBreak())
        
        # Add stakeholder information
        if self.include_sections.get('stakeholder_data', True):
            story.extend(self._create_stakeholder_section())
            story.append(PageBreak())
        
        # Add appendices
        story.extend(self._create_appendices())
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_page_header_footer, onLaterPages=self._add_page_header_footer)
        
        buffer.seek(0)
        return buffer

    
    def _create_cover_page(self):
        """Create the cover page"""
        story = []
        
        # Add company logo if provided
        if self.company_logo:
            try:
                logo_data = base64.b64decode(self.company_logo)
                logo_buffer = BytesIO(logo_data)
                logo = ReportLabImage(logo_buffer, width=2*inch, height=1*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.5*inch))
            except Exception as e:
                logger.warning(f"Could not add logo: {str(e)}")
        
        # Title
        story.append(Paragraph(self.report_title, self.styles['CustomTitle']))
        story.append(Spacer(1, 0.6*inch))  # Move 2 lines down
        
        # Subtitle - separate paragraphs to prevent overlapping
        framework_name = getattr(self.project.framework, 'name', 'Compliance Framework') if self.project.framework else 'Compliance Framework'
        story.append(Paragraph(f"{framework_name} Assessment Report", self.styles['CustomHeading2']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        # Report metadata table
        metadata = [
            ['Organization:', self.project.organization.name if self.project.organization else 'Organization'],
            ['Project Name:', self.project.name],
            ['Framework:', self.project.framework.name],
            ['Assessment Date:', datetime.now().strftime('%B %d, %Y')],
            ['Generated By:', self.user.get_full_name() if self.user else 'System'],
            ['Report Version:', '1.0'],
            ['Status:', 'Final']
        ]
        
        metadata_table = Table(metadata, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 0), (0, -1), self.colors['light_gray']),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
        ]))
        
        story.append(metadata_table)
        story.append(Spacer(1, 1*inch))
        
        # Disclaimer
        disclaimer = """
        <b>CONFIDENTIAL</b><br/>
        This report contains confidential and proprietary information. It is intended solely for the use of the client organization and should not be distributed to third parties without written consent.
        """
        story.append(Paragraph(disclaimer, self.styles['CustomBody']))
        
        return story
    
    def _create_table_of_contents(self):
        """Create table of contents"""
        story = []
        
        story.append(Paragraph("Table of Contents", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.6*inch))  # Move 2 lines down
        
        toc_items = [
            ['1. Executive Summary', '3'],
            ['2. Assessment Methodology', '4'],
            ['3. Control Assessment Results', '5'],
            ['4. Compliance Scoring and Analytics', '8'],
            ['5. Risk Assessment', '10'],
            ['6. Remediation Planning', '12'],
            ['7. Evidence Management', '14'],
            ['8. Technical Findings', '16'],
            ['9. Stakeholder Information', '18'],
            ['Appendix A: Control Details', '20'],
            ['Appendix B: Action Items', '25'],
            ['Appendix C: Evidence Inventory', '30']
        ]
        
        toc_table = Table(toc_items, colWidths=[5*inch, 1*inch])
        toc_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
        ]))
        
        story.append(toc_table)
        
        return story
    
    def _create_executive_summary(self):
        """Create executive summary section"""
        story = []
        
        story.append(Paragraph("1. Executive Summary", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        # Key findings
        metadata = self.report_data['metadata']['report_info']
        compliance_data = self.report_data['compliance_scoring']
        framework_name = getattr(self.project.framework, 'name', 'Compliance Framework') if self.project.framework else 'Compliance Framework'
        
        # Get control assessment summary with new data structure
        control_summary = self.report_data['control_assessment']['assessment_summary']
        
        summary_text = f"""
        This report presents the results of the {framework_name} compliance assessment for {metadata['client_organization_name']} 
        conducted on {datetime.fromisoformat(metadata['assessment_date']).strftime('%B %d, %Y')}. 
        The assessment evaluated {control_summary['total_controls']} controls 
        against the {metadata['framework_name']} framework.
        
        <b>Overall Compliance Status:</b> {control_summary['compliance_percentage']}% compliant
        
        <b>Key Findings:</b>
        • {control_summary['total_controls']} total controls assessed
        • {control_summary['total_subcontrols']} total subcontrols evaluated
        • {control_summary['completed_subcontrols']} subcontrols completed
        • {control_summary['controls_completed']} controls fully completed
        • {control_summary['controls_in_progress']} controls in progress
        • {control_summary['controls_not_started']} controls not started
        
        <b>Priority Areas for Improvement:</b>
        The assessment identified key areas requiring immediate attention, particularly controls that are not started or in progress. 
        A detailed remediation plan has been developed with specific timelines and responsible parties.
        """
        
        story.append(Paragraph(summary_text, self.styles['ExecutiveSummary']))
        story.append(Spacer(1, 0.3*inch))
        
        # Add compliance radar chart
        chart_image = self._create_radar_chart()
        if chart_image:
            story.append(chart_image)
        
        return story
    
    def _create_methodology_section(self):
        """Create methodology section"""
        story = []
        
        story.append(Paragraph("2. Assessment Methodology", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        framework_name = getattr(self.project.framework, 'name', 'Compliance Framework') if self.project.framework else 'Compliance Framework'
        methodology_text = f"""
        <b>Assessment Approach:</b><br/>
        This assessment was conducted using a systematic approach based on {framework_name} requirements. 
        The methodology included document review, stakeholder interviews, technical testing, and evidence validation.
        
        <b>Assessment Criteria:</b><br/>
        • <b>Conforms:</b> Control is fully implemented and effective<br/>
        • <b>Minor Non-Conformity:</b> Control is implemented but has minor gaps<br/>
        • <b>Major Non-Conformity:</b> Control is not implemented or has significant gaps<br/>
        • <b>Cannot be Assessed:</b> Insufficient information to determine compliance status<br/>
        
        <b>Evidence Collection:</b><br/>
        Evidence was collected through multiple sources including policies, procedures, technical configurations, 
        screenshots, and stakeholder interviews. All evidence was validated and cross-referenced against control requirements.
        """
        
        story.append(Paragraph(methodology_text, self.styles['CustomBody']))
        
        return story
    
    def _create_control_assessment_section(self):
        """Create control assessment results section"""
        story = []
        
        story.append(Paragraph("3. Control Assessment Results", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        # Summary statistics
        assessment_data = self.report_data['control_assessment']
        summary = assessment_data['assessment_summary']
        
        story.append(Paragraph("3.1 Assessment Summary", self.styles['CustomHeading2']))
        
        # Create summary table using new data structure
        summary_data = [
            ['Metric', 'Count', 'Percentage'],
            ['Total Controls Assessed', str(summary['total_controls']), '100%'],
            ['Total Subcontrols', str(summary['total_subcontrols']), '100%'],
            ['Completed Subcontrols', str(summary['completed_subcontrols']), f"{summary['compliance_percentage']}%"],
            ['Completed Controls', str(summary['controls_completed']), f"{round((summary['controls_completed'] / summary['total_controls'] * 100), 1) if summary['total_controls'] > 0 else 0}%"],
            ['In Progress Controls', str(summary['controls_in_progress']), f"{round((summary['controls_in_progress'] / summary['total_controls'] * 100), 1) if summary['total_controls'] > 0 else 0}%"],
            ['Not Started Controls', str(summary['controls_not_started']), f"{round((summary['controls_not_started'] / summary['total_controls'] * 100), 1) if summary['total_controls'] > 0 else 0}%"],
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 1*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Control category breakdown
        story.append(Paragraph("3.2 Control Category Breakdown", self.styles['CustomHeading2']))
        
        category_data = [['Control Category', 'Total Controls', 'Completed', 'In Progress', 'Not Started']]
        
        for category, count in summary['category_distribution'].items():
            # Calculate status counts for this category using new data structure
            completed = 0
            in_progress = 0
            not_started = 0
            
            for control in assessment_data['controls']:
                if control['control_category'] == category:
                    status = control.get('implementation_status', 'Not Started')
                    if status == 'Completed':
                        completed += 1
                    elif status == 'In Progress':
                        in_progress += 1
                    else:
                        not_started += 1
            
            category_data.append([category, str(count), str(completed), str(in_progress), str(not_started)])
        
        category_table = Table(category_data, colWidths=[2*inch, 1*inch, 1*inch, 1*inch, 1*inch])
        category_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['secondary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
        ]))
        
        story.append(category_table)
        
        return story
    
    def _create_compliance_scoring_section(self):
        """Create compliance scoring and analytics section"""
        story = []
        
        story.append(Paragraph("4. Compliance Scoring and Analytics", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        compliance_data = self.report_data['compliance_scoring']
        
        # Overall compliance metrics
        story.append(Paragraph("4.1 Overall Compliance Metrics", self.styles['CustomHeading2']))
        
        metrics_text = f"""
        <b>Overall Compliance Rate:</b> {compliance_data['overall_compliance_percentage']}%<br/>
        <b>Gap Closure Progress:</b> {compliance_data['gap_closure_progress']['progress_percentage']}%<br/>
        <b>Total Gaps Identified:</b> {compliance_data['gap_closure_progress']['total_gaps_identified']}<br/>
        <b>Gaps Remaining:</b> {compliance_data['gap_closure_progress']['gaps_remaining']}
        """
        
        story.append(Paragraph(metrics_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        # Compliance by category chart
        story.append(Paragraph("4.2 Compliance by Control Category", self.styles['CustomHeading2']))
        
        # Create category compliance table
        category_data = [['Control Category', 'Compliance Percentage']]
        for category, percentage in compliance_data['compliance_scores_by_category'].items():
            category_data.append([category, f"{percentage}%"])
        
        category_compliance_table = Table(category_data, colWidths=[4*inch, 2*inch])
        category_compliance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
        ]))
        
        story.append(category_compliance_table)
        
        return story
    
    def _create_risk_assessment_section(self):
        """Create risk assessment section"""
        story = []
        
        story.append(Paragraph("5. Risk Assessment", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        risk_data = self.report_data['risk_assessment']
        
        # Risk summary
        story.append(Paragraph("5.1 Risk Summary", self.styles['CustomHeading2']))
        
        risk_summary_text = f"""
        <b>Total Risks Identified:</b> {risk_data['risk_summary']['total_risks']}<br/>
        <b>High Impact Risks:</b> {risk_data['risk_summary']['by_impact'].get('High', 0)}<br/>
        <b>Open Risks:</b> {risk_data['risk_summary']['by_status'].get('open', 0)}<br/>
        <b>Mitigated Risks:</b> {risk_data['risk_summary']['by_status'].get('mitigated', 0)}
        """
        
        story.append(Paragraph(risk_summary_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        # Risk breakdown table
        if risk_data['risks']:
            story.append(Paragraph("5.2 Risk Details", self.styles['CustomHeading2']))
            
            risk_table_data = [['Risk Title', 'Category', 'Impact', 'Status', 'Owner']]
            
            for risk in risk_data['risks'][:10]:  # Show top 10 risks
                risk_table_data.append([
                    risk['risk_title'][:30] + '...' if len(risk['risk_title']) > 30 else risk['risk_title'],
                    risk['risk_category'],
                    risk['impact'],
                    risk['status'],
                    risk['owner'][:20] + '...' if len(risk['owner']) > 20 else risk['owner']
                ])
            
            risk_table = Table(risk_table_data, colWidths=[2*inch, 1*inch, 0.8*inch, 1*inch, 1.2*inch])
            risk_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.colors['danger']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
            ]))
            
            story.append(risk_table)
        
        return story
    
    def _create_remediation_planning_section(self):
        """Create remediation planning section"""
        story = []
        
        story.append(Paragraph("6. Remediation Planning", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        remediation_data = self.report_data['remediation_planning']
        
        # Action items summary
        story.append(Paragraph("6.1 Action Items Summary", self.styles['CustomHeading2']))
        
        summary = remediation_data['action_items_summary']
        summary_text = f"""
        <b>Total Action Items:</b> {summary['total_items']}<br/>
        <b>High Priority Items:</b> {summary['by_priority'].get('High', 0)}<br/>
        <b>Pending Items:</b> {summary['by_status'].get('Pending', 0)}<br/>
        <b>Completed Items:</b> {summary['by_status'].get('Approved', 0)}
        """
        
        story.append(Paragraph(summary_text, self.styles['CustomBody']))
        story.append(Spacer(1, 0.2*inch))
        
        # Action items table
        if remediation_data['action_items']:
            story.append(Paragraph("6.2 Priority Action Items", self.styles['CustomHeading2']))
            
            # Sort by priority and take top items
            high_priority_items = [item for item in remediation_data['action_items'] if item['priority'] == 'High'][:5]
            
            if high_priority_items:
                action_table_data = [['Action Item', 'Priority', 'Status', 'Owner', 'Due Date']]
                
                for item in high_priority_items:
                    due_date = item['due_date'][:10] if item['due_date'] else 'Not Set'
                    action_table_data.append([
                        item['title'][:40] + '...' if len(item['title']) > 40 else item['title'],
                        item['priority'],
                        item['status'],
                        item['assigned_owner'][:15] + '...' if len(item['assigned_owner']) > 15 else item['assigned_owner'],
                        due_date
                    ])
                
                action_table = Table(action_table_data, colWidths=[2.5*inch, 0.8*inch, 1*inch, 1.2*inch, 1*inch])
                action_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), self.colors['warning']),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
                ]))
                
                story.append(action_table)
        
        return story
    
    def _create_evidence_management_section(self):
        """Create evidence management section"""
        story = []
        
        story.append(Paragraph("7. Evidence Management", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        evidence_data = self.report_data['evidence_management']
        
        # Evidence summary
        story.append(Paragraph("7.1 Evidence Summary", self.styles['CustomHeading2']))
        
        summary = evidence_data['evidence_summary']
        summary_text = f"""
        <b>Total Evidence Items:</b> {summary['total_evidence_items']}<br/>
        <b>Policy Documents:</b> {summary['by_type'].get('policy', 0)}<br/>
        <b>Screenshots:</b> {summary['by_type'].get('screenshot', 0)}<br/>
        <b>Configuration Files:</b> {summary['by_type'].get('configuration', 0)}<br/>
        <b>Validated Evidence:</b> {summary['validation_status'].get('Validated', 0)}
        """
        
        story.append(Paragraph(summary_text, self.styles['CustomBody']))
        
        return story
    
    def _create_technical_findings_section(self):
        """Create technical findings section"""
        story = []
        
        story.append(Paragraph("8. Technical Findings", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        technical_data = self.report_data['technical_findings']
        
        # Tool recommendations
        story.append(Paragraph("8.1 Security Tool Recommendations", self.styles['CustomHeading2']))
        
        if technical_data['tool_recommendations']:
            tool_table_data = [['Category', 'Recommended Tools', 'Current Status']]
            
            for tool_rec in technical_data['tool_recommendations']:
                tools_list = ', '.join(tool_rec['recommended_tools'][:3])  # Show first 3 tools
                tool_table_data.append([
                    tool_rec['category'],
                    tools_list,
                    tool_rec['current_status']
                ])
            
            tool_table = Table(tool_table_data, colWidths=[1.5*inch, 3*inch, 1.5*inch])
            tool_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.colors['secondary']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
            ]))
            
            story.append(tool_table)
        
        return story
    
    def _create_stakeholder_section(self):
        """Create stakeholder information section"""
        story = []
        
        story.append(Paragraph("9. Stakeholder Information", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        stakeholder_data = self.report_data['stakeholder_data']
        
        # Stakeholder table
        if stakeholder_data['stakeholders']:
            story.append(Paragraph("9.1 Key Stakeholders", self.styles['CustomHeading2']))
            
            stakeholder_table_data = [['Name', 'Position', 'Department', 'Role in Project']]
            
            for stakeholder in stakeholder_data['stakeholders']:
                stakeholder_table_data.append([
                    stakeholder['name'],
                    stakeholder['position'],
                    stakeholder['department'],
                    stakeholder['role_in_project']
                ])
            
            stakeholder_table = Table(stakeholder_table_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
            stakeholder_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.colors['primary']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
            ]))
            
            story.append(stakeholder_table)
        
        return story
    
    def _create_appendices(self):
        """Create appendices with all controls"""
        story = []
        
        story.append(Paragraph("Appendices", self.styles['CustomHeading1']))
        story.append(Spacer(1, 0.5*inch))  # Move 2 lines down
        
        # Appendix A: Detailed control findings
        story.append(Paragraph("Appendix A: Detailed Control Findings", self.styles['CustomHeading2']))
        story.append(Spacer(1, 0.3*inch))
        
        control_data = self.report_data['control_assessment']['controls']
        
        if control_data:
            # Create a comprehensive table of all controls
            control_table_data = [['Control ID', 'Control Name', 'Category', 'Status', 'Progress']]
            
            for control in control_data:
                # Get control details safely
                control_id = control.get('control_id', 'N/A')
                control_name = control.get('control_name', 'N/A')
                control_category = control.get('control_category', 'N/A')
                implementation_status = control.get('implementation_status', 'Not Started')
                progress = control.get('progress', 0)
                
                # Truncate long names for table display
                display_name = control_name[:40] + '...' if len(control_name) > 40 else control_name
                display_category = control_category[:20] + '...' if len(control_category) > 20 else control_category
                
                control_table_data.append([
                    control_id,
                    display_name,
                    display_category,
                    implementation_status,
                    f"{progress}%"
                ])
            
            # Create the controls table
            control_table = Table(control_table_data, colWidths=[1*inch, 2.5*inch, 1.5*inch, 1*inch, 0.8*inch])
            control_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), self.colors['primary']),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'LEFT'),
                ('ALIGN', (3, 0), (3, -1), 'CENTER'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, self.colors['light_gray']]),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
            ]))
            
            story.append(control_table)
            story.append(Spacer(1, 0.3*inch))
            
            # Add detailed control information for first 10 controls (to avoid PDF becoming too large)
            story.append(Paragraph("Appendix B: Detailed Control Information", self.styles['CustomHeading2']))
            story.append(Spacer(1, 0.2*inch))
            
            for i, control in enumerate(control_data[:10]):  # Show first 10 controls in detail
                control_id = control.get('control_id', 'N/A')
                control_name = control.get('control_name', 'N/A')
                control_category = control.get('control_category', 'N/A')
                implementation_status = control.get('implementation_status', 'Not Started')
                progress = control.get('progress', 0)
                
                # Get implementation details safely
                implementation_details = control.get('implementation_details', {})
                implementation_stage = implementation_details.get('implementation_stage', 'Not Specified')
                priority_ranking = implementation_details.get('priority_ranking', 'N/A')
                current_state = implementation_details.get('current_state_observations', 'No observations recorded')
                gap_analysis = implementation_details.get('gap_analysis_findings', 'No gap analysis available')
                
                story.append(Paragraph(f"B.{i+1} {control_id}: {control_name}", 
                                     self.styles['CustomHeading2']))
                
                control_details = f"""
                <b>Category:</b> {control_category}<br/>
                <b>Implementation Status:</b> {implementation_status}<br/>
                <b>Progress:</b> {progress}%<br/>
                <b>Implementation Stage:</b> {implementation_stage}<br/>
                <b>Priority Ranking:</b> {priority_ranking}/10<br/>
                <b>Current State:</b> {current_state}<br/>
                <b>Gap Analysis:</b> {gap_analysis}
                """
                
                story.append(Paragraph(control_details, self.styles['CustomBody']))
                story.append(Spacer(1, 0.2*inch))
            
            # Add note about remaining controls
            if len(control_data) > 10:
                remaining_count = len(control_data) - 10
                story.append(Paragraph(f"<i>Note: {remaining_count} additional controls are available in the full assessment data. Contact the assessment team for complete details.</i>", 
                                     self.styles['CustomBody']))
        
        else:
            story.append(Paragraph("No control data available for this assessment.", self.styles['CustomBody']))
        
        return story
    
    def _create_radar_chart(self):
        """Create radar chart for compliance by category"""
        try:
            visual_data = self.report_data['visual_elements']['radar_chart_data']
            
            if not visual_data:
                return None
            
            # Create matplotlib figure
            fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(projection='polar'))
            
            # Prepare data
            categories = [item['category'] for item in visual_data]
            scores = [item['score'] for item in visual_data]
            
            # Number of variables
            N = len(categories)
            
            # Compute angle for each category
            angles = [n / float(N) * 2 * np.pi for n in range(N)]
            angles += angles[:1]  # Complete the circle
            
            # Add scores
            scores += scores[:1]  # Complete the circle
            
            # Plot
            ax.plot(angles, scores, 'o-', linewidth=2, label='Compliance Score', color='#2E8B57')
            ax.fill(angles, scores, alpha=0.25, color='#2E8B57')
            
            # Add category labels
            ax.set_xticks(angles[:-1])
            ax.set_xticklabels(categories, fontsize=10)
            
            # Set y-axis limits
            ax.set_ylim(0, 100)
            ax.set_yticks([20, 40, 60, 80, 100])
            ax.set_yticklabels(['20%', '40%', '60%', '80%', '100%'])
            
            # Add title
            ax.set_title('Compliance Maturity by Control Category', size=14, fontweight='bold', pad=20)
            
            # Add grid
            ax.grid(True)
            
            # Save to buffer
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            
            # Create ReportLab image
            img = ReportLabImage(buffer, width=5*inch, height=5*inch)
            img.hAlign = 'CENTER'
            
            plt.close(fig)
            
            return img
            
        except Exception as e:
            logger.error(f"Error creating radar chart: {str(e)}")
            return None
    
    def _add_page_header_footer(self, canvas, doc):
        """Add header and footer to each page"""
        canvas.saveState()
    
    # Header text - moved down by 18 points
        canvas.setFont('Helvetica-Bold', 12)
        canvas.setFillColor(self.colors['primary'])
        canvas.drawString(72, doc.height + 78, self.report_title)  # CHANGED: +50 → +68
    
    # Draw line under header - moved down by 18 points
        canvas.setStrokeColor(self.colors['primary'])
        canvas.setLineWidth(1)
        canvas.line(72, doc.height + 65, doc.width + 72, doc.height + 65)  # CHANGED: +35 → +53
    
    # Footer (unchanged)
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.black)
        canvas.drawString(72, 30, f"Generated: {datetime.now().strftime('%B %d, %Y')}")
        canvas.drawRightString(doc.width + 72, 30, f"Page {canvas.getPageNumber()}")
    
        canvas.restoreState()

