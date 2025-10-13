"""
URL configuration for compliance_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
#grc_project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
# --- Add these imports ---
from rest_framework.routers import DefaultRouter
from auditing.views import LogViewSet

# --- Add this section ---
# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'logs', LogViewSet, basename='log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/questionnaire/', include('questionnaire.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/', include('compliance_monitoring.urls')),
    path('api/privacy-detection/', include('privacy_detection.urls')),
    
    # --- Add this line ---
    # The API router provides the /api/logs/ endpoint
    path('api/', include(router.urls)),
    # The chatbot API provides the /api/chat/ endpoint
    path("api/chat/", include("chatbot.urls")),
    # The compliance API provides the /api/compliance/ endpoint
    path("api/auditing/", include("auditing.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)