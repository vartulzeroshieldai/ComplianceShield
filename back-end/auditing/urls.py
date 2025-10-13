# grc/auditing/urls.py
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import LogViewSet, RiskViewSet, ActionItemViewSet, CommentViewSet, AuditorReviewViewSet, TodoViewSet, get_evidence_collection_stats

router = SimpleRouter()
router.register(r'logs', LogViewSet, basename='log')
router.register(r'risks', RiskViewSet, basename='risk')
router.register(r'todos', TodoViewSet, basename='todo')
router.register(r'action-items', ActionItemViewSet, basename='action-item')

# The router.register line for 'evidence' has been removed.

urlpatterns = [
    path('', include(router.urls)),
    # Evidence collection statistics
    path('evidence-collection-stats/', get_evidence_collection_stats, name='evidence-collection-stats'),
    # Project-specific comment URLs
    path('projects/<int:project_pk>/controls/<int:control_pk>/comments/', 
         CommentViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='project-control-comments'),
    path('projects/<int:project_pk>/controls/<int:control_pk>/comments/<int:pk>/', 
         CommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), 
         name='project-control-comment-detail'),
    # Backward compatibility - control-specific comments (without project)
    path('controls/<int:control_pk>/comments/', 
         CommentViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='control-comments'),
    path('controls/<int:control_pk>/comments/<int:pk>/', 
         CommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), 
         name='control-comment-detail'),
]