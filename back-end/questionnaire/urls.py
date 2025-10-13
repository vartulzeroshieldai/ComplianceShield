# questionnaire/urls.py
# Description: Maps the API views to URL endpoints.
# UPDATED: Added new questionnaire result endpoints

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    # CategoryViewSet, 
    # AssessmentViewSet,  # Legacy views (commented out)
    QuestionnaireResultViewSet,  # New views
    submit_questionnaire,
    questionnaire_analytics
)

# Create a router and register our viewsets with it.
router = DefaultRouter()
# router.register(r'categories', CategoryViewSet, basename='category')
# router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'results', QuestionnaireResultViewSet, basename='questionnaire-result')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    
    # New questionnaire result endpoints
    path('submit/', submit_questionnaire, name='submit-questionnaire'),
    path('analytics/', questionnaire_analytics, name='questionnaire-analytics'),
]