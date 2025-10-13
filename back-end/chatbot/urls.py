# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.chat_with_rasa, name="chat_with_rasa"),
]
