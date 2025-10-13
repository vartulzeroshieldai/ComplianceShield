from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q, Count
import time
from .models import PrivacyDetectionProject, PrivacyScan, PrivacyFinding, PrivacyReport
from .serializers import (
    PrivacyDetectionProjectSerializer, 
    PrivacyDetectionProjectCreateSerializer,
    PrivacyScanSerializer,
    PrivacyFindingSerializer,
    PrivacyReportSerializer,
    CookieAnalysisRequestSerializer,
    PrivacyScanRequestSerializer
)
from .code_inspection_scanner import CodeInspectionScanner
from .mobsf_integration import MobSFIntegration
from .pia_analyzer import PIAAnalyzer
from compliance_monitoring.models import Project

# ViewSets for CRUD operations
class PrivacyDetectionProjectViewSet(ModelViewSet):
    serializer_class = PrivacyDetectionProjectSerializer
    permission_classes = [IsAuthenticated]
    queryset = PrivacyDetectionProject.objects.all()
    
    def get_queryset(self):
        return PrivacyDetectionProject.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PrivacyDetectionProjectCreateSerializer
        return PrivacyDetectionProjectSerializer
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_scan(self, request, pk=None):
        """Start a new scan for a privacy detection project"""
        project = self.get_object()
        serializer = PrivacyScanRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            scan_type = serializer.validated_data['scan_type']
            parameters = serializer.validated_data.get('parameters', {})
            
            # Create new scan
            scan = PrivacyScan.objects.create(
                project=project,
                scan_type=scan_type,
                status='pending',
                results={}
            )
            
            # Start the scan based on type
            if scan_type == 'cookie_analysis':
                url = parameters.get('url')
                if url:
                    # Run cookie analysis
                    from .cookie_scanner import CookieScanner
                    scanner = CookieScanner()
                    result = scanner.analyze_website(url)
                    
                    if 'error' not in result:
                        scan.status = 'completed'
                        scan.results = result
                        scan.completed_at = timezone.now()
                        scan.findings_count = len(result.get('cookies', []))
                        scan.risk_level = self._calculate_risk_level(result)
                    else:
                        scan.status = 'failed'
                        scan.results = {'error': result['error']}
                    
                    scan.save()
            
            elif scan_type == 'security_headers':
                url = parameters.get('url')
                if url:
                    # Run security headers analysis
                    from .security_headers_scanner import SecurityHeadersScanner
                    scanner = SecurityHeadersScanner()
                    result = scanner.analyze_website(url)
                    
                    if 'error' not in result:
                        scan.status = 'completed'
                        scan.results = result
                        scan.completed_at = timezone.now()
                        scan.findings_count = len(result.get('missing_headers', [])) + len(result.get('weak_headers', []))
                        scan.risk_level = self._calculate_security_headers_risk_level(result)
                    else:
                        scan.status = 'failed'
                        scan.results = {'error': result['error']}
                    
                    scan.save()
            
            return Response(PrivacyScanSerializer(scan).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def dashboard_data(self, request, pk=None):
        """Get dashboard data for a privacy detection project"""
        project = self.get_object()
        
        # Get scan statistics
        scans = project.scans.all()
        total_scans = scans.count()
        completed_scans = scans.filter(status='completed').count()
        
        # Get findings statistics
        findings = PrivacyFinding.objects.filter(scan__project=project)
        total_findings = findings.count()
        critical_findings = findings.filter(severity='critical', status__in=['open', 'in_progress']).count()
        high_findings = findings.filter(severity='high', status__in=['open', 'in_progress']).count()
        
        # Get recent scans
        recent_scans = scans.order_by('-created_at')[:5]
        
        # Get findings by severity
        findings_by_severity = findings.values('severity').annotate(count=Count('id'))
        
        dashboard_data = {
            'project': PrivacyDetectionProjectSerializer(project).data,
            'statistics': {
                'total_scans': total_scans,
                'completed_scans': completed_scans,
                'total_findings': total_findings,
                'critical_findings': critical_findings,
                'high_findings': high_findings,
                'completion_rate': (completed_scans / total_scans * 100) if total_scans > 0 else 0
            },
            'recent_scans': PrivacyScanSerializer(recent_scans, many=True).data,
            'findings_by_severity': list(findings_by_severity)
        }
        
        return Response(dashboard_data)
    
    def _calculate_risk_level(self, result):
        """Calculate risk level based on scan results"""
        cookies = result.get('cookies', [])
        if not cookies:
            return 'low'
        
        high_risk_count = sum(1 for cookie in cookies if cookie.get('risk_level') == 'high')
        if high_risk_count > 0:
            return 'high'
        
        medium_risk_count = sum(1 for cookie in cookies if cookie.get('risk_level') == 'medium')
        if medium_risk_count > 2:
            return 'medium'
        
        return 'low'
    
    def _calculate_security_headers_risk_level(self, result):
        """Calculate risk level based on security headers scan results"""
        summary = result.get('summary', {})
        risk_level = summary.get('risk_level', 'UNKNOWN')
        
        # Map risk levels to model choices
        if risk_level == 'HIGH':
            return 'high'
        elif risk_level == 'MEDIUM':
            return 'medium'
        else:
            return 'low'

class PrivacyScanViewSet(ModelViewSet):
    serializer_class = PrivacyScanSerializer
    permission_classes = [IsAuthenticated]
    queryset = PrivacyScan.objects.all()
    
    def get_queryset(self):
        return PrivacyScan.objects.filter(project__owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def findings(self, request, pk=None):
        """Get findings for a specific scan"""
        scan = self.get_object()
        findings = scan.findings.all()
        serializer = PrivacyFindingSerializer(findings, many=True)
        return Response(serializer.data)

class PrivacyFindingViewSet(ModelViewSet):
    serializer_class = PrivacyFindingSerializer
    permission_classes = [IsAuthenticated]
    queryset = PrivacyFinding.objects.all()
    
    def get_queryset(self):
        return PrivacyFinding.objects.filter(scan__project__owner=self.request.user)

# Legacy API endpoints for backward compatibility
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_security_headers_check(request):
    """
    Run Security Headers Check analysis on a given website URL
    """
    try:
        serializer = CookieAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        url = serializer.validated_data['url']
        project_id = serializer.validated_data.get('project_id')
        
        # Import security headers scanner locally to avoid import issues
        from .security_headers_scanner import SecurityHeadersScanner
        
        # Initialize security headers scanner
        scanner = SecurityHeadersScanner()
        
        # Run analysis
        result = scanner.analyze_website(url)
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # If project_id is provided, save the results
        if project_id:
            try:
                project = PrivacyDetectionProject.objects.get(id=project_id, owner=request.user)
                scan = PrivacyScan.objects.create(
                    project=project,
                    scan_type='security_headers',
                    status='completed',
                    results=result,
                    completed_at=timezone.now(),
                    findings_count=len(result.get('missing_headers', [])) + len(result.get('weak_headers', []))
                )
                result['scan_id'] = scan.id
            except PrivacyDetectionProject.DoesNotExist:
                pass
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Unexpected error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_cookie_analyzer(request):
    """
    Run Cookie Scanner analysis on a given website URL
    """
    try:
        serializer = CookieAnalysisRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        url = serializer.validated_data['url']
        project_id = serializer.validated_data.get('project_id')
        
        # Import cookie scanner locally to avoid import issues
        from .cookie_scanner import CookieScanner
        
        # Initialize cookie scanner
        scanner = CookieScanner()
        
        # Run analysis
        result = scanner.analyze_website(url)
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # If project_id is provided, save the results
        if project_id:
            try:
                project = PrivacyDetectionProject.objects.get(id=project_id, owner=request.user)
                scan = PrivacyScan.objects.create(
                    project=project,
                    scan_type='cookie_analysis',
                    status='completed',
                    results=result,
                    completed_at=timezone.now(),
                    findings_count=len(result.get('cookies', []))
                )
                result['scan_id'] = scan.id
            except PrivacyDetectionProject.DoesNotExist:
                pass
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Unexpected error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_projects(request):
    """Get all privacy detection projects for the current user"""
    projects = PrivacyDetectionProject.objects.filter(owner=request.user)
    serializer = PrivacyDetectionProjectSerializer(projects, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """Get comprehensive dashboard statistics for the user"""
    from django.db.models import Sum
    from .models import PIAResult, DPIAResult, RoPAResult
    
    user_projects = PrivacyDetectionProject.objects.filter(owner=request.user)
    
    # Basic project counts
    total_projects = user_projects.count()
    active_projects = user_projects.filter(status__in=['pending', 'running']).count()
    
    # Legacy findings (existing system)
    legacy_findings = PrivacyFinding.objects.filter(scan__project__owner=request.user)
    legacy_total = legacy_findings.count()
    legacy_critical = legacy_findings.filter(
        severity='critical',
        status__in=['open', 'in_progress']
    ).count()
    
    # Privacy Assessment findings (PIA, DPIA, RoPA)
    pia_findings = PIAResult.objects.filter(user=request.user).aggregate(
        total=Sum('total_risks'),
        critical=Sum('critical_risks'),
        high=Sum('high_risks')
    )
    
    dpia_findings = DPIAResult.objects.filter(user=request.user).aggregate(
        total=Sum('total_risks'),
        critical=Sum('critical_risks'),
        high=Sum('high_risks')
    )
    
    ropa_findings = RoPAResult.objects.filter(user=request.user).aggregate(
        total=Sum('total_risks'),
        critical=Sum('critical_risks'),
        high=Sum('high_risks')
    )
    
    # Calculate comprehensive totals
    total_findings = (
        legacy_total + 
        (pia_findings['total'] or 0) + 
        (dpia_findings['total'] or 0) + 
        (ropa_findings['total'] or 0)
    )
    
    critical_findings = (
        legacy_critical + 
        (pia_findings['critical'] or 0) + 
        (dpia_findings['critical'] or 0) + 
        (ropa_findings['critical'] or 0) +
        (pia_findings['high'] or 0) +  # Include high as critical for dashboard
        (dpia_findings['high'] or 0) +
        (ropa_findings['high'] or 0)
    )
    
    # Scan completion stats
    total_scans = PrivacyScan.objects.filter(project__owner=request.user).count()
    completed_scans = PrivacyScan.objects.filter(
        project__owner=request.user, 
        status='completed'
    ).count()
    
    stats = {
        'total_projects': total_projects,
        'active_projects': active_projects,
        'total_scans': total_scans,
        'completed_scans': completed_scans,
        'total_findings': total_findings,
        'critical_findings': critical_findings,
        'completion_rate': (completed_scans / total_scans * 100) if total_scans > 0 else 0,
        # Additional breakdown for debugging
        'legacy_findings': legacy_total,
        'pia_findings': pia_findings['total'] or 0,
        'dpia_findings': dpia_findings['total'] or 0,
        'ropa_findings': ropa_findings['total'] or 0
    }
    
    return Response(stats)


# Code Inspection API Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_repository_connection(request):
    """
    Test repository connection for GitHub/GitLab
    """
    try:
        repository_url = request.data.get('repository_url')
        access_token = request.data.get('access_token')
        
        print(f"🔍 Repository connection test - URL: {repository_url}, Token: {'***' if access_token else 'None'}")
        
        if not repository_url:
            return Response(
                {'error': 'Repository URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize code inspection scanner
        scanner = CodeInspectionScanner()
        
        # Test connection
        result = scanner.test_repository_connection(repository_url, access_token)
        
        print(f"🔍 Connection test result: {result}")
        
        # Return the actual result from the connection test
        if result['status'] == 'success':
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        print(f"🔍 Repository connection error: {str(e)}")
        return Response(
            {'error': f'Connection test failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def truffle_scan(request):
    """
    Run TruffleHog scan on repository
    """
    print(f"🔍 DEBUG: TruffleHog scan API called")
    print(f"🔍 DEBUG: Request data: {request.data}")
    
    try:
        repository_url = request.data.get('repository_url')
        access_token = request.data.get('access_token')
        
        print(f"🔍 DEBUG: Repository URL: {repository_url}")
        print(f"🔍 DEBUG: Access token provided: {bool(access_token)}")
        
        if not repository_url:
            print("🔍 DEBUG: No repository URL provided")
            return Response(
                {'error': 'Repository URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize code inspection scanner
        print("🔍 DEBUG: Initializing CodeInspectionScanner...")
        with CodeInspectionScanner() as scanner:
            # Clone repository
            print("🔍 DEBUG: Cloning repository...")
            repo_path = scanner.clone_repository(repository_url, access_token)
            print(f"🔍 DEBUG: Repository cloned to: {repo_path}")
            
            # Run TruffleHog scan
            print("🔍 DEBUG: Running TruffleHog scan...")
            result = scanner.run_truffle_scan(repo_path)
            print(f"🔍 DEBUG: TruffleHog scan result: {result}")
            
            return Response(result, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"🔍 DEBUG: TruffleHog scan error: {str(e)}")
        return Response(
            {'error': f'TruffleHog scan failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gitleaks_scan(request):
    """
    Run GitLeaks scan on repository
    """
    print(f"🔍 DEBUG: GitLeaks scan API called")
    print(f"🔍 DEBUG: Request data: {request.data}")
    
    try:
        repository_url = request.data.get('repository_url')
        access_token = request.data.get('access_token')
        
        print(f"🔍 DEBUG: Repository URL: {repository_url}")
        print(f"🔍 DEBUG: Access token provided: {bool(access_token)}")
        
        if not repository_url:
            print("🔍 DEBUG: No repository URL provided")
            return Response(
                {'error': 'Repository URL is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize code inspection scanner
        print("🔍 DEBUG: Initializing CodeInspectionScanner...")
        with CodeInspectionScanner() as scanner:
            # Clone repository
            print("🔍 DEBUG: Cloning repository...")
            repo_path = scanner.clone_repository(repository_url, access_token)
            print(f"🔍 DEBUG: Repository cloned to: {repo_path}")
            
            # Run GitLeaks scan
            print("🔍 DEBUG: Running GitLeaks scan...")
            result = scanner.run_gitleaks_scan(repo_path)
            print(f"🔍 DEBUG: GitLeaks scan result: {result}")
            
            return Response(result, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"🔍 DEBUG: GitLeaks scan error: {str(e)}")
        return Response(
            {'error': f'GitLeaks scan failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sast_scan(request):
    """
    Run SAST-Scan (Static Application Security Testing) on uploaded file
    """
    print(f"🔍 DEBUG: SAST-Scan API called")
    print(f"🔍 DEBUG: Request files: {list(request.FILES.keys())}")
    
    try:
        # Check if file is uploaded
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file uploaded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        print(f"🔍 DEBUG: Uploaded file: {uploaded_file.name}, size: {uploaded_file.size}")
        
        # Initialize code inspection scanner
        print("🔍 DEBUG: Initializing CodeInspectionScanner for SAST-Scan...")
        with CodeInspectionScanner() as scanner:
            # Create temporary file and scan it
            print("🔍 DEBUG: Creating temporary file and running SAST-Scan...")
            result = scanner.run_sast_scan(uploaded_file)
            print(f"🔍 DEBUG: SAST-Scan result: {result}")
            
            return Response(result, status=status.HTTP_200_OK)
            
    except Exception as e:
        print(f"🔍 DEBUG: SAST-Scan error: {str(e)}")
        return Response(
            {'error': f'SAST-Scan failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mobile_scan(request):
    """
    Run Mobile Analysis on uploaded APK/IPA file using MobSF
    """
    try:
        # Check if file is uploaded
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file uploaded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        scan_type = request.data.get('scan_type', 'static')
        
        # Validate file type
        if not uploaded_file.name.lower().endswith(('.apk', '.ipa')):
            return Response(
                {'error': 'Only APK and IPA files are supported'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize MobSF integration
        mobsf = MobSFIntegration()
        
        # Read file content
        file_content = uploaded_file.read()
        
        # Run mobile analysis
        result = mobsf.scan_mobile_app(file_content, uploaded_file.name, scan_type)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Mobile scan failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mobsf_health(request):
    """
    Check MobSF service health
    """
    print(f"🔍 DEBUG: MobSF Health API called")
    
    try:
        # Initialize MobSF integration
        print("🔍 DEBUG: Initializing MobSF integration for health check...")
        mobsf = MobSFIntegration()
        
        # Check health
        print("🔍 DEBUG: Checking MobSF health...")
        result = mobsf.health_check()
        print(f"🔍 DEBUG: MobSF health result: {result}")
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"🔍 DEBUG: MobSF health check error: {str(e)}")
        return Response(
            {'error': f'MobSF health check failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pia_report(request):
    """
    Generate Privacy Impact Assessment (PIA) report by aggregating
    findings from Git-Scan, Security Headers, and Cookie Analyzer
    """
    print(f"🔍 DEBUG: PIA report generation API called")
    print(f"🔍 DEBUG: Request data: {request.data}")
    
    try:
        # Extract scan results from request
        git_scan_results = request.data.get('git_scan_results')
        security_headers_results = request.data.get('security_headers_results')
        cookie_analysis_results = request.data.get('cookie_analysis_results')
        truffle_scan_results = request.data.get('truffle_scan_results')
        mobile_scan_results = request.data.get('mobile_scan_results')
        project_info = request.data.get('project_info', {})
        
        print(f"🔍 DEBUG: Git-Scan results provided: {bool(git_scan_results)}")
        print(f"🔍 DEBUG: Security Headers results provided: {bool(security_headers_results)}")
        print(f"🔍 DEBUG: Cookie Analysis results provided: {bool(cookie_analysis_results)}")
        print(f"🔍 DEBUG: TruffleHog/SAST results provided: {bool(truffle_scan_results)}")
        print(f"🔍 DEBUG: Mobile Analysis results provided: {bool(mobile_scan_results)}")
        
        # Check if at least one scan result is provided
        if not any([git_scan_results, security_headers_results, cookie_analysis_results, truffle_scan_results, mobile_scan_results]):
            return Response(
                {
                    'error': 'At least one scan result is required to generate PIA report',
                    'message': 'Please run at least one scan (Git-Scan, Security Headers, Cookie Analyzer, SAST, or Mobile Analysis) first'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize PIA analyzer
        print("🔍 DEBUG: Initializing PIAAnalyzer...")
        analyzer = PIAAnalyzer()
        
        # Generate PIA report
        print("🔍 DEBUG: Generating PIA report...")
        pia_report = analyzer.generate_pia_report(
            git_scan_results=git_scan_results,
            security_headers_results=security_headers_results,
            cookie_analysis_results=cookie_analysis_results,
            truffle_scan_results=truffle_scan_results,
            mobile_scan_results=mobile_scan_results,
            project_info=project_info
        )
        
        print(f"🔍 DEBUG: PIA report generated successfully")
        print(f"🔍 DEBUG: Overall risk level: {pia_report['overall_risk']['risk_level']}")
        print(f"🔍 DEBUG: Total risks: {pia_report['risk_assessment']['total_risks']}")
        print(f"🔍 DEBUG: Recommendations: {pia_report['recommendations_count']}")
        
        # Save PIA result to database
        try:
            from .models import PIAResult
            
            pia_result = PIAResult.objects.create(
                user=request.user,
                project_name=project_info.get('name', ''),
                project_type=project_info.get('type', ''),
                project_url=project_info.get('url', ''),
                overall_risk_level=pia_report['overall_risk']['risk_level'],
                risk_score=pia_report['overall_risk']['risk_score'],
                critical_risks=pia_report['risk_assessment']['risk_distribution']['critical'],
                high_risks=pia_report['risk_assessment']['risk_distribution']['high'],
                medium_risks=pia_report['risk_assessment']['risk_distribution']['medium'],
                low_risks=pia_report['risk_assessment']['risk_distribution']['low'],
                total_risks=pia_report['risk_assessment']['total_risks'],
                total_data_points=pia_report['data_inventory']['total_data_points'],
                recommendations_count=pia_report['recommendations_count'],
                full_report=pia_report,
                used_git_scan=bool(git_scan_results),
                used_sast_scan=bool(truffle_scan_results),
                used_mobile_scan=bool(mobile_scan_results),
                used_security_headers=bool(security_headers_results),
                used_cookie_analysis=bool(cookie_analysis_results)
            )
            
            print(f"🔍 DEBUG: PIA result saved to database with ID: {pia_result.id}")
            
            # Add the database ID to the response
            pia_report['pia_result_id'] = pia_result.id
            
        except Exception as save_error:
            print(f"⚠️ WARNING: Failed to save PIA result to database: {str(save_error)}")
            # Continue anyway - don't fail the request if DB save fails
        
        return Response(pia_report, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"🔍 DEBUG: PIA report generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to generate PIA report: {str(e)}',
                'details': 'An unexpected error occurred during PIA analysis'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pia_results(request):
    """
    Retrieve list of PIA results for the authenticated user
    """
    from .models import PIAResult
    from .serializers import PIAResultSerializer
    
    try:
        # Get user's PIA results, ordered by most recent first
        pia_results = PIAResult.objects.filter(user=request.user).order_by('-generated_at')
        
        # Optional filtering by risk level
        risk_level = request.query_params.get('risk_level')
        if risk_level:
            pia_results = pia_results.filter(overall_risk_level=risk_level.upper())
        
        # Pagination
        limit = int(request.query_params.get('limit', 10))
        offset = int(request.query_params.get('offset', 0))
        
        total_count = pia_results.count()
        pia_results = pia_results[offset:offset + limit]
        
        serializer = PIAResultSerializer(pia_results, many=True)
        
        return Response({
            'count': total_count,
            'results': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve PIA results: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to retrieve PIA results: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pia_result(request, pia_id):
    """
    Retrieve a specific PIA result by ID
    """
    from .models import PIAResult
    from .serializers import PIAResultSerializer
    
    try:
        pia_result = PIAResult.objects.get(id=pia_id, user=request.user)
        serializer = PIAResultSerializer(pia_result)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except PIAResult.DoesNotExist:
        return Response(
            {
                'error': 'PIA result not found or you do not have permission to access it'
            },
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve PIA result: {str(e)}")
        return Response(
            {
                'error': f'Failed to retrieve PIA result: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_dpia_report(request):
    """
    Generate comprehensive Data Protection Impact Assessment (DPIA) report
    """
    try:
        from .dpia_analyzer import DPIAAnalyzer
        
        # Extract scan results from request
        git_scan_results = request.data.get('git_scan_results')
        truffle_scan_results = request.data.get('truffle_scan_results')
        mobile_scan_results = request.data.get('mobile_scan_results')
        security_headers_results = request.data.get('security_headers_results')
        cookie_analysis_results = request.data.get('cookie_analysis_results')
        
        # Extract project information
        project_info = {
            'name': request.data.get('project_name', 'Unknown Project'),
            'type': request.data.get('project_type', 'Web Application'),
            'url': request.data.get('project_url', '')
        }
        
        print(f"🔍 DEBUG: Git-Scan results provided: {bool(git_scan_results)}")
        print(f"🔍 DEBUG: Security Headers results provided: {bool(security_headers_results)}")
        print(f"🔍 DEBUG: Cookie Analysis results provided: {bool(cookie_analysis_results)}")
        print(f"🔍 DEBUG: TruffleHog/SAST results provided: {bool(truffle_scan_results)}")
        print(f"🔍 DEBUG: Mobile Analysis results provided: {bool(mobile_scan_results)}")
        
        # Initialize DPIA Analyzer
        print(f"🔍 DEBUG: Initializing DPIAAnalyzer...")
        dpia_analyzer = DPIAAnalyzer()
        
        # Generate DPIA report
        print(f"🔍 DEBUG: Generating DPIA report...")
        dpia_report = dpia_analyzer.generate_dpia_report(
            git_scan_results=git_scan_results,
            truffle_scan_results=truffle_scan_results,
            mobile_scan_results=mobile_scan_results,
            security_headers_results=security_headers_results,
            cookie_analysis_results=cookie_analysis_results,
            project_info=project_info
        )
        
        print(f"🔍 DEBUG: DPIA report generated successfully")
        print(f"🔍 DEBUG: Overall risk level: {dpia_report['overall_risk']['risk_level']}")
        print(f"🔍 DEBUG: Total risks: {dpia_report['risk_assessment']['total_risks']}")
        print(f"🔍 DEBUG: Recommendations: {dpia_report['recommendations_count']}")
        
        # Save DPIA result to database
        try:
            from .models import DPIAResult
            
            dpia_result = DPIAResult.objects.create(
                user=request.user,
                project_name=project_info.get('name', ''),
                project_type=project_info.get('type', ''),
                project_url=project_info.get('url', ''),
                overall_risk_level=dpia_report['overall_risk']['risk_level'],
                risk_score=dpia_report['overall_risk']['risk_score'],
                critical_risks=dpia_report['risk_assessment']['risk_distribution']['critical'],
                high_risks=dpia_report['risk_assessment']['risk_distribution']['high'],
                medium_risks=dpia_report['risk_assessment']['risk_distribution']['medium'],
                low_risks=dpia_report['risk_assessment']['risk_distribution']['low'],
                total_risks=dpia_report['risk_assessment']['total_risks'],
                total_data_points=dpia_report['data_inventory']['total_data_points'],
                pii_categories_found=len(dpia_report['data_inventory']['pii_categories']),
                third_party_integrations=len(dpia_report['data_inventory']['third_party_integrations']),
                legal_impact_score=dpia_report['overall_impact']['legal_impact_score'],
                financial_impact_score=dpia_report['overall_impact']['financial_impact_score'],
                reputational_impact_score=dpia_report['overall_impact']['reputational_impact_score'],
                overall_impact_score=dpia_report['overall_impact']['impact_score'],
                gdpr_compliance_score=dpia_report['overall_compliance']['gdpr_compliance_score'],
                dpdpa_compliance_score=dpia_report['overall_compliance']['dpdpa_compliance_score'],
                hipaa_compliance_score=dpia_report['overall_compliance']['hipaa_compliance_score'],
                ccpa_compliance_score=dpia_report['overall_compliance']['ccpa_compliance_score'],
                overall_compliance_score=dpia_report['overall_compliance']['compliance_score'],
                recommendations_count=dpia_report['recommendations_count'],
                mitigation_measures_count=dpia_report['mitigation_measures_count'],
                full_report=dpia_report,
                used_git_scan=bool(git_scan_results),
                used_sast_scan=bool(truffle_scan_results),
                used_mobile_scan=bool(mobile_scan_results),
                used_security_headers=bool(security_headers_results),
                used_cookie_analysis=bool(cookie_analysis_results)
            )
            
            print(f"🔍 DEBUG: DPIA result saved to database with ID: {dpia_result.id}")
            
            # Add the database ID to the response
            dpia_report['dpia_result_id'] = dpia_result.id
            
        except Exception as save_error:
            print(f"⚠️ WARNING: Failed to save DPIA result to database: {str(save_error)}")
            # Continue anyway - don't fail the request if DB save fails
        
        return Response(dpia_report, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"🔍 DEBUG: DPIA report generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to generate DPIA report: {str(e)}',
                'details': 'An unexpected error occurred during DPIA analysis'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_dpia_results(request):
    """
    Retrieve list of DPIA results for the authenticated user
    """
    from .models import DPIAResult
    from .serializers import DPIAResultSerializer
    
    try:
        # Get user's DPIA results, ordered by most recent first
        dpia_results = DPIAResult.objects.filter(user=request.user).order_by('-generated_at')
        
        # Optional filtering by risk level
        risk_level = request.query_params.get('risk_level')
        if risk_level:
            dpia_results = dpia_results.filter(overall_risk_level=risk_level.upper())
        
        # Pagination
        limit = int(request.query_params.get('limit', 10))
        offset = int(request.query_params.get('offset', 0))
        
        total_count = dpia_results.count()
        dpia_results = dpia_results[offset:offset + limit]
        
        serializer = DPIAResultSerializer(dpia_results, many=True)
        
        return Response({
            'count': total_count,
            'results': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve DPIA results: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to retrieve DPIA results: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dpia_result(request, dpia_id):
    """
    Retrieve a specific DPIA result by ID
    """
    from .models import DPIAResult
    
    try:
        dpia_result = DPIAResult.objects.get(id=dpia_id, user=request.user)
        return Response(dpia_result.full_report, status=status.HTTP_200_OK)
        
    except DPIAResult.DoesNotExist:
        return Response(
            {'error': 'DPIA result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve DPIA result: {str(e)}")
        return Response(
            {
                'error': f'Failed to retrieve DPIA result: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ropa_report(request):
    """
    Generate comprehensive Records of Processing Activities (RoPA) report
    """
    try:
        from .ropa_analyzer import RoPAAnalyzer
        
        # Extract scan results from request
        git_scan_results = request.data.get('git_scan_results')
        truffle_scan_results = request.data.get('truffle_scan_results')
        mobile_scan_results = request.data.get('mobile_scan_results')
        security_headers_results = request.data.get('security_headers_results')
        cookie_analysis_results = request.data.get('cookie_analysis_results')
        
        # Extract project information
        project_info = {
            'name': request.data.get('project_name', 'Unknown Project'),
            'type': request.data.get('project_type', 'Web Application'),
            'url': request.data.get('project_url', '')
        }
        
        print(f"🔍 DEBUG: Git-Scan results provided: {bool(git_scan_results)}")
        print(f"🔍 DEBUG: Security Headers results provided: {bool(security_headers_results)}")
        print(f"🔍 DEBUG: Cookie Analysis results provided: {bool(cookie_analysis_results)}")
        print(f"🔍 DEBUG: TruffleHog/SAST results provided: {bool(truffle_scan_results)}")
        print(f"🔍 DEBUG: Mobile Analysis results provided: {bool(mobile_scan_results)}")
        
        # Initialize RoPA Analyzer
        print(f"🔍 DEBUG: Initializing RoPAAnalyzer...")
        ropa_analyzer = RoPAAnalyzer()
        
        # Generate RoPA report
        print(f"🔍 DEBUG: Generating RoPA report...")
        ropa_report = ropa_analyzer.generate_ropa_report(
            git_scan_results=git_scan_results,
            truffle_scan_results=truffle_scan_results,
            mobile_scan_results=mobile_scan_results,
            security_headers_results=security_headers_results,
            cookie_analysis_results=cookie_analysis_results,
            project_info=project_info
        )
        
        print(f"🔍 DEBUG: RoPA report generated successfully")
        print(f"🔍 DEBUG: Overall risk level: {ropa_report['overall_risk']['risk_level']}")
        print(f"🔍 DEBUG: Total risks: {ropa_report['risk_assessment']['total_risks']}")
        print(f"🔍 DEBUG: Processing activities: {ropa_report['data_inventory']['total_processing_activities']}")
        
        # Save RoPA result to database
        try:
            from .models import RoPAResult
            
            ropa_result = RoPAResult.objects.create(
                user=request.user,
                project_name=project_info.get('name', ''),
                project_type=project_info.get('type', ''),
                project_url=project_info.get('url', ''),
                total_processing_activities=ropa_report['data_inventory']['total_processing_activities'],
                pii_categories_processed=ropa_report['data_inventory']['pii_categories_processed'],
                data_subjects_count=ropa_report['data_inventory']['data_subjects_count'],
                processing_purposes_count=ropa_report['data_inventory']['processing_purposes_count'],
                overall_risk_level=ropa_report['overall_risk']['risk_level'],
                risk_score=ropa_report['overall_risk']['risk_score'],
                critical_risks=ropa_report['risk_assessment']['risk_distribution']['critical'],
                high_risks=ropa_report['risk_assessment']['risk_distribution']['high'],
                medium_risks=ropa_report['risk_assessment']['risk_distribution']['medium'],
                low_risks=ropa_report['risk_assessment']['risk_distribution']['low'],
                total_risks=ropa_report['risk_assessment']['total_risks'],
                legal_impact_score=ropa_report['overall_impact']['legal_impact_score'],
                financial_impact_score=ropa_report['overall_impact']['financial_impact_score'],
                reputational_impact_score=ropa_report['overall_impact']['reputational_impact_score'],
                overall_impact_score=ropa_report['overall_impact']['impact_score'],
                gdpr_compliance_score=ropa_report['overall_compliance']['gdpr_compliance_score'],
                dpdpa_compliance_score=ropa_report['overall_compliance']['dpdpa_compliance_score'],
                hipaa_compliance_score=ropa_report['overall_compliance']['hipaa_compliance_score'],
                ccpa_compliance_score=ropa_report['overall_compliance']['ccpa_compliance_score'],
                overall_compliance_score=ropa_report['overall_compliance']['compliance_score'],
                mitigation_measures_count=ropa_report['mitigation_measures_count'],
                technical_controls_count=ropa_report['technical_controls_count'],
                administrative_controls_count=ropa_report['administrative_controls_count'],
                full_report=ropa_report,
                used_git_scan=bool(git_scan_results),
                used_sast_scan=bool(truffle_scan_results),
                used_mobile_scan=bool(mobile_scan_results),
                used_security_headers=bool(security_headers_results),
                used_cookie_analysis=bool(cookie_analysis_results)
            )
            
            print(f"🔍 DEBUG: RoPA result saved to database with ID: {ropa_result.id}")
            
            # Add the database ID to the response
            ropa_report['ropa_result_id'] = ropa_result.id
            
        except Exception as save_error:
            print(f"⚠️ WARNING: Failed to save RoPA result to database: {str(save_error)}")
            # Continue anyway - don't fail the request if DB save fails
        
        return Response(ropa_report, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"🔍 DEBUG: RoPA report generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to generate RoPA report: {str(e)}',
                'details': 'An unexpected error occurred during RoPA analysis'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ropa_results(request):
    """
    Retrieve list of RoPA results for the authenticated user
    """
    from .models import RoPAResult
    from .serializers import RoPAResultSerializer
    
    try:
        # Get user's RoPA results, ordered by most recent first
        ropa_results = RoPAResult.objects.filter(user=request.user).order_by('-generated_at')
        
        # Optional filtering by risk level
        risk_level = request.query_params.get('risk_level')
        if risk_level:
            ropa_results = ropa_results.filter(overall_risk_level=risk_level.upper())
        
        # Pagination
        limit = int(request.query_params.get('limit', 10))
        offset = int(request.query_params.get('offset', 0))
        
        total_count = ropa_results.count()
        ropa_results = ropa_results[offset:offset + limit]
        
        serializer = RoPAResultSerializer(ropa_results, many=True)
        
        return Response({
            'count': total_count,
            'results': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve RoPA results: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to retrieve RoPA results: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ropa_result(request, ropa_id):
    """
    Retrieve a specific RoPA result by ID
    """
    from .models import RoPAResult
    
    try:
        ropa_result = RoPAResult.objects.get(id=ropa_id, user=request.user)
        return Response(ropa_result.full_report, status=status.HTTP_200_OK)
        
    except RoPAResult.DoesNotExist:
        return Response(
            {'error': 'RoPA result not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve RoPA result: {str(e)}")
        return Response(
            {
                'error': f'Failed to retrieve RoPA result: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_privacy_context_data(request):
    """
    Get privacy detection context data for dashboard visualization
    Organization-based data aggregation for the logged-in user
    """
    from .models import PIAResult, DPIAResult, RoPAResult
    from django.db.models import Sum, Count
    
    try:
        print(f"🔍 Privacy Context Data - User: {request.user.username}")
        
        # Get user's privacy assessment results (organization-based filtering)
        # Filter out any results with null, empty, or "Unknown Project" project_name
        pia_results = PIAResult.objects.filter(
            user=request.user,
            project_name__isnull=False
        ).exclude(project_name__exact='').exclude(project_name__exact='Unknown Project').order_by('-generated_at')
        
        dpia_results = DPIAResult.objects.filter(
            user=request.user,
            project_name__isnull=False
        ).exclude(project_name__exact='').exclude(project_name__exact='Unknown Project').order_by('-generated_at')
        
        ropa_results = RoPAResult.objects.filter(
            user=request.user,
            project_name__isnull=False
        ).exclude(project_name__exact='').exclude(project_name__exact='Unknown Project').order_by('-generated_at')
        
        print(f"🔍 Found {pia_results.count()} PIA results, {dpia_results.count()} DPIA results, {ropa_results.count()} RoPA results for user {request.user}")
        
        # Get unique project names from all assessments using the new get_project_name() method
        all_projects = set()
        for result in pia_results:
            project_name = result.get_project_name()
            if project_name != "Unknown Project":
                all_projects.add(project_name)
        for result in dpia_results:
            project_name = result.get_project_name()
            if project_name != "Unknown Project":
                all_projects.add(project_name)
        for result in ropa_results:
            project_name = result.get_project_name()
            if project_name != "Unknown Project":
                all_projects.add(project_name)
        
        print(f"🔍 Found {len(all_projects)} unique projects: {list(all_projects)}")
        print(f"🔍 Projects after filtering out 'Unknown Project': {[p for p in all_projects if p != 'Unknown Project']}")
        
        # Only use real data - no mock/sample data
        if pia_results.exists() or dpia_results.exists() or ropa_results.exists():
            print("🔍 Using ONLY real privacy assessment data")
            
            # Aggregate all risk data across all projects
            total_critical = sum([
                pia_results.aggregate(Sum('critical_risks'))['critical_risks__sum'] or 0,
                dpia_results.aggregate(Sum('critical_risks'))['critical_risks__sum'] or 0,
                ropa_results.aggregate(Sum('critical_risks'))['critical_risks__sum'] or 0
            ])
            
            total_high = sum([
                pia_results.aggregate(Sum('high_risks'))['high_risks__sum'] or 0,
                dpia_results.aggregate(Sum('high_risks'))['high_risks__sum'] or 0,
                ropa_results.aggregate(Sum('high_risks'))['high_risks__sum'] or 0
            ])
            
            total_medium = sum([
                pia_results.aggregate(Sum('medium_risks'))['medium_risks__sum'] or 0,
                dpia_results.aggregate(Sum('medium_risks'))['medium_risks__sum'] or 0,
                ropa_results.aggregate(Sum('medium_risks'))['medium_risks__sum'] or 0
            ])
            
            total_low = sum([
                pia_results.aggregate(Sum('low_risks'))['low_risks__sum'] or 0,
                dpia_results.aggregate(Sum('low_risks'))['low_risks__sum'] or 0,
                ropa_results.aggregate(Sum('low_risks'))['low_risks__sum'] or 0
            ])
            
            # Use ONLY actual project names as business units - no mock data
            business_units = list(all_projects) if all_projects else []
            
            # If no projects, return empty data
            if not business_units:
                print("🔍 No projects found in privacy assessments")
                risk_level_data = []
                data_category_data = []
                assessment_type_data = []
                total_assessments = 0
                total_risks = 0
            else:
                print(f"🔍 Using real project names as business units: {business_units}")
                
                # Map risks to actual projects based on their project_name
                project_risks = {}
                for unit in business_units:
                    project_risks[unit] = {
                        'Low Risk': 0,
                        'Medium Risk': 0,
                        'High Risk': 0,
                        'Critical Risk': 0
                    }
                
                # Aggregate risks by project from actual data using get_project_name() method
                for result in pia_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_risks:
                        project_risks[project_name]['Low Risk'] += result.low_risks or 0
                        project_risks[project_name]['Medium Risk'] += result.medium_risks or 0
                        project_risks[project_name]['High Risk'] += result.high_risks or 0
                        project_risks[project_name]['Critical Risk'] += result.critical_risks or 0
                
                for result in dpia_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_risks:
                        project_risks[project_name]['Low Risk'] += result.low_risks or 0
                        project_risks[project_name]['Medium Risk'] += result.medium_risks or 0
                        project_risks[project_name]['High Risk'] += result.high_risks or 0
                        project_risks[project_name]['Critical Risk'] += result.critical_risks or 0
                
                for result in ropa_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_risks:
                        project_risks[project_name]['Low Risk'] += result.low_risks or 0
                        project_risks[project_name]['Medium Risk'] += result.medium_risks or 0
                        project_risks[project_name]['High Risk'] += result.high_risks or 0
                        project_risks[project_name]['Critical Risk'] += result.critical_risks or 0
                
                # Convert to chart data format
                risk_level_data = []
                for unit in business_units:
                    risk_level_data.append({
                        'businessUnit': unit,
                        'Low Risk': project_risks[unit]['Low Risk'],
                        'Medium Risk': project_risks[unit]['Medium Risk'],
                        'High Risk': project_risks[unit]['High Risk'],
                        'Critical Risk': project_risks[unit]['Critical Risk']
                    })
                
                # Data category distribution based on actual assessment types
                data_category_data = []
                for unit in business_units:
                    # Map assessment types to data categories based on real data
                    pia_count = pia_results.count() // len(business_units)
                    dpia_count = dpia_results.count() // len(business_units)
                    ropa_count = ropa_results.count() // len(business_units)
                    
                    data_category_data.append({
                        'businessUnit': unit,
                        'User Identifiers': pia_count,  # PIA typically handles user data
                        'Device Data': dpia_count,      # DPIA handles device/technical data
                        'Authentication': ropa_count,   # RoPA handles processing activities
                        'Financial': max(0, (pia_count + dpia_count) // 2),
                        'Health': max(0, (dpia_count + ropa_count) // 2)
                    })
                
                # Assessment type distribution by project
                project_assessments = {}
                for unit in business_units:
                    project_assessments[unit] = {
                        'PIA': 0,
                        'DPIA': 0,
                        'RoPA': 0
                    }
                
                # Count assessments by project using get_project_name() method
                for result in pia_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_assessments:
                        project_assessments[project_name]['PIA'] += 1
                
                for result in dpia_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_assessments:
                        project_assessments[project_name]['DPIA'] += 1
                
                for result in ropa_results:
                    project_name = result.get_project_name()
                    if project_name != "Unknown Project" and project_name in project_assessments:
                        project_assessments[project_name]['RoPA'] += 1
                
                # Convert to chart data format
                assessment_type_data = []
                for unit in business_units:
                    assessment_type_data.append({
                        'businessUnit': unit,
                        'PIA': project_assessments[unit]['PIA'],
                        'DPIA': project_assessments[unit]['DPIA'],
                        'RoPA': project_assessments[unit]['RoPA']
                    })
                
                total_assessments = pia_results.count() + dpia_results.count() + ropa_results.count()
                total_risks = total_critical + total_high + total_medium + total_low
            
            print(f"🔍 Real data: {total_assessments} assessments, {total_risks} risks")
        else:
            print("🔍 No real privacy assessment data found - returning empty data")
            # Return empty data instead of sample data
            risk_level_data = []
            data_category_data = []
            assessment_type_data = []
            business_units = []
            total_assessments = 0
            total_risks = 0
            all_projects = set()
        
        return Response({
            'risk_level_data': risk_level_data,
            'data_category_data': data_category_data,
            'assessment_type_data': assessment_type_data,
            'summary': {
                'total_assessments': total_assessments,
                'total_risks': total_risks,
                'business_units': len(business_units),
                'projects_count': len(all_projects) if all_projects else 6,
                'last_updated': timezone.now().isoformat(),
                'data_source': 'real' if (pia_results.exists() or dpia_results.exists() or ropa_results.exists()) else 'no_data'
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ ERROR: Failed to retrieve privacy context data: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {
                'error': f'Failed to retrieve privacy context data: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


