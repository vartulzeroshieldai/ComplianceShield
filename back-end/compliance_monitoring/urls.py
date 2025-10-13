# GRC/compliance_monitoring/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from rest_framework.routers import SimpleRouter
from .views import FrameworkViewSet, ProjectViewSet, ClauseViewSet, SubClauseViewSet, EvidenceViewSet
from auditing.views import CommentViewSet, AuditorReviewViewSet
from .report_views import generate_report_data, download_pdf_report, get_report_parameters

# Create a top-level router for various endpoints
router = SimpleRouter()
router.register(r'frameworks', FrameworkViewSet, basename='framework')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'controls', ClauseViewSet, basename='control')
router.register(r'subcontrols', SubClauseViewSet, basename='subcontrol')

# --- Nested route for Evidence within Projects ---
# Creates URLs like /projects/{project_pk}/evidence/
projects_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
projects_router.register(r'evidence', EvidenceViewSet, basename='project-evidence')

# --- Nested routes for Comments, Reviews, and Subcontrols within Controls (Clauses) ---
# Creates URLs like /controls/{control_pk}/comments/
controls_router = routers.NestedSimpleRouter(router, r'controls', lookup='control')
controls_router.register(r'comments', CommentViewSet, basename='control-comments')
controls_router.register(r'reviews', AuditorReviewViewSet, basename='control-reviews')
controls_router.register(r'subcontrols', SubClauseViewSet, basename='control-subcontrols')

# The urlpatterns now include all the main and nested routes
urlpatterns = [
    path('', include(router.urls)),
    path('', include(projects_router.urls)),
    path('', include(controls_router.urls)),
    
     # Report generation endpoints
    path('projects/<int:project_id>/report/data/', generate_report_data, name='generate-report-data'),
    path('projects/<int:project_id>/report/pdf/', download_pdf_report, name='download-pdf-report'),
    path('projects/<int:project_id>/report/parameters/', get_report_parameters, name='get-report-parameters'),
]