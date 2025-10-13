# compliance_monitoring/report_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Project
from .report_builder import ComplianceReportBuilder
from .pdf_generator import CompliancePDFGenerator
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_report_data(request, project_id):
    """
    API endpoint to generate structured report data for a project.
    
    Query Parameters:
    - date_from: Start date for assessment data (YYYY-MM-DD)
    - date_to: End date for assessment data (YYYY-MM-DD)
    - control_categories: Comma-separated list of control categories to include
    - format: 'json' (default) or 'pdf'
    """
    try:
        # Get and validate project
        project = get_object_or_404(Project, id=project_id)
        
        # Check user permissions
        if not project.has_access(request.user):
            return Response(
                {"error": "You don't have access to this project"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse query parameters
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')
        control_categories = request.GET.get('control_categories')
        output_format = request.GET.get('format', 'json').lower()
        
        # Parse dates
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date_from format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date_to format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Initialize report builder
        report_builder = ComplianceReportBuilder(project_id, user=request.user)
        
        # Generate report data
        report_data = report_builder.build_complete_report_data(
            date_from=date_from,
            date_to=date_to,
            control_categories=control_categories
        )
        
        if output_format == 'pdf':
            return generate_pdf_report(request, project_id, report_data)
        
        # Return JSON data
        return Response({
            "success": True,
            "project_id": project_id,
            "project_name": project.name,
            "generated_at": timezone.now().isoformat(),
            "report_data": report_data
        }, status=status.HTTP_200_OK)
        
    except Project.DoesNotExist:
        return Response(
            {"error": "Project not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error generating report for project {project_id}: {str(e)}")
        return Response(
            {"error": f"Failed to generate report: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def download_pdf_report(request, project_id):
    """
    API endpoint to download a PDF report for a project.
    
    POST Body:
    {
        "date_from": "2024-01-01",
        "date_to": "2024-12-31",
        "control_categories": ["Access Control", "Asset Management"],
        "include_sections": {
            "executive_summary": true,
            "control_details": true,
            "risk_assessment": true,
            "remediation_plan": true
        },
        "report_title": "ISO 27001 Compliance Assessment Report",
        "company_logo": "base64_encoded_logo_data"
    }
    """
    try:
        # Get and validate project
        project = get_object_or_404(Project, id=project_id)
        
        # Check user permissions
        if not project.has_access(request.user):
            return Response(
                {"error": "You don't have access to this project"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parse request data
        data = request.data
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        control_categories = data.get('control_categories')
        include_sections = data.get('include_sections', {})
        report_title = data.get('report_title', f"{project.name} - Compliance Assessment Report")
        company_logo = data.get('company_logo')
        
        # Parse dates
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date_from format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date_to format. Use YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Initialize report builder
        report_builder = ComplianceReportBuilder(project_id, user=request.user)
        
        # Generate report data
        report_data = report_builder.build_complete_report_data(
            date_from=date_from,
            date_to=date_to,
            control_categories=control_categories
        )
        
        # Generate PDF
        pdf_generator = CompliancePDFGenerator(
            report_data=report_data,
            project=project,
            user=request.user,
            report_title=report_title,
            company_logo=company_logo,
            include_sections=include_sections
        )
        
        pdf_buffer = pdf_generator.generate_pdf()
        
        # Create HTTP response with PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        filename = f"{project.name.replace(' ', '_')}_Compliance_Report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_buffer.getvalue())
        
        return response
        
    except Project.DoesNotExist:
        return Response(
            {"error": "Project not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error generating PDF report for project {project_id}: {str(e)}")
        return Response(
            {"error": f"Failed to generate PDF report: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def generate_pdf_report(request, project_id, report_data):
    """
    Helper function to generate PDF report from report data.
    """
    try:
        project = get_object_or_404(Project, id=project_id)
        
        # Generate PDF
        pdf_generator = CompliancePDFGenerator(
            report_data=report_data,
            project=project,
            user=request.user
        )
        
        pdf_buffer = pdf_generator.generate_pdf()
        
        # Create HTTP response with PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        filename = f"{project.name.replace(' ', '_')}_Report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_buffer.getvalue())
        
        return response
        
    except Exception as e:
        logger.error(f"Error in generate_pdf_report: {str(e)}")
        return Response(
            {"error": f"Failed to generate PDF: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_report_parameters(request, project_id):
    """
    Get available parameters for report generation.
    """
    try:
        project = get_object_or_404(Project, id=project_id)
        
        # Check user permissions
        if not project.has_access(request.user):
            return Response(
                {"error": "You don't have access to this project"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get available control categories
        control_categories = []
        for clause in project.framework.clauses.all():
            category = _categorize_control(clause.title)
            if category not in control_categories:
                control_categories.append(category)
        
        # Get date ranges
        from auditing.models import AuditorReview
        earliest_review = AuditorReview.objects.filter(
            control__framework=project.framework
        ).order_by('created_at').first()
        
        latest_review = AuditorReview.objects.filter(
            control__framework=project.framework
        ).order_by('-created_at').first()
        
        return Response({
            "project_id": project_id,
            "project_name": project.name,
            "framework": project.framework.name,
            "available_parameters": {
                "control_categories": sorted(control_categories),
                "date_range": {
                    "earliest_assessment": earliest_review.created_at.date().isoformat() if earliest_review else None,
                    "latest_assessment": latest_review.created_at.date().isoformat() if latest_review else None
                },
                "report_sections": {
                    "executive_summary": "Executive summary with key findings",
                    "control_details": "Detailed control assessment results", 
                    "compliance_scoring": "Compliance metrics and analytics",
                    "risk_assessment": "Risk analysis and treatment status",
                    "remediation_plan": "Action items and PDCA activities",
                    "evidence_management": "Documentation and evidence tracking",
                    "technical_findings": "Technology inventory and vulnerabilities",
                    "stakeholder_data": "Team and responsibility assignments"
                },
                "output_formats": ["json", "pdf"]
            }
        }, status=status.HTTP_200_OK)
        
    except Project.DoesNotExist:
        return Response(
            {"error": "Project not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error getting report parameters for project {project_id}: {str(e)}")
        return Response(
            {"error": f"Failed to get report parameters: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _categorize_control(control_title):
    """Helper function to categorize controls"""
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
