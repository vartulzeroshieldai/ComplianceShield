from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PrivacyDetectionProjectViewSet,
    PrivacyScanViewSet,
    PrivacyFindingViewSet,
    run_cookie_analyzer,
    run_security_headers_check,
    get_user_projects,
    get_dashboard_stats,
    test_repository_connection,
    truffle_scan,
    gitleaks_scan,
    sast_scan,
    mobile_scan,
    mobsf_health,
    generate_pia_report,
    list_pia_results,
    get_pia_result,
    generate_dpia_report,
    list_dpia_results,
    get_dpia_result,
    generate_ropa_report,
    list_ropa_results,
    get_ropa_result,
    get_privacy_context_data,
)

router = DefaultRouter()
router.register(r'projects', PrivacyDetectionProjectViewSet)
router.register(r'scans', PrivacyScanViewSet)
router.register(r'findings', PrivacyFindingViewSet)

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
    
    # Legacy endpoints
    path('cookie-analyzer/', run_cookie_analyzer, name='cookie-analyzer'),
    path('security-headers/', run_security_headers_check, name='security-headers'),
    path('user-projects/', get_user_projects, name='user-projects'),
    path('dashboard-stats/', get_dashboard_stats, name='dashboard-stats'),
    
    # Code Inspection endpoints
    path('test-repository-connection/', test_repository_connection, name='test-repository-connection'),
    path('truffle-scan/', truffle_scan, name='truffle-scan'),
    path('gitleaks-scan/', gitleaks_scan, name='gitleaks-scan'),
    path('sast-scan/', sast_scan, name='sast-scan'),
    
    # Mobile Analysis endpoints
    path('mobile-scan/', mobile_scan, name='mobile-scan'),
    path('mobsf-health/', mobsf_health, name='mobsf-health'),
    
    # Privacy Impact Assessment endpoints
    path('generate-pia/', generate_pia_report, name='generate-pia'),
    path('pia-results/', list_pia_results, name='list-pia-results'),
    path('pia-results/<int:pia_id>/', get_pia_result, name='get-pia-result'),
    
    # Data Protection Impact Assessment endpoints
    path('generate-dpia/', generate_dpia_report, name='generate-dpia'),
    path('dpia-results/', list_dpia_results, name='list-dpia-results'),
    path('dpia-results/<int:dpia_id>/', get_dpia_result, name='get-dpia-result'),
    
    # Records of Processing Activities endpoints
    path('generate-ropa/', generate_ropa_report, name='generate-ropa'),
    path('ropa-results/', list_ropa_results, name='list-ropa-results'),
    path('ropa-results/<int:ropa_id>/', get_ropa_result, name='get-ropa-result'),
    
    # Privacy Context Data endpoint
    path('privacy-context-data/', get_privacy_context_data, name='get-privacy-context-data'),
]