from django.contrib import admin
from .models import (
    # Legacy models (if they exist)
    # Question, Answer, Category, SubCategory, Assessment,
    # New models
    QuestionnaireResult, CategoryScore, QuestionResponse
)

# Register your models here.

admin.site.site_header = "Compliance Project Admin"
admin.site.index_title = "Welcome to the Compliance Project Admin Portal"

# Register new questionnaire models
@admin.register(QuestionnaireResult)
class QuestionnaireResultAdmin(admin.ModelAdmin):
    list_display = ['user', 'overall_score', 'total_questions', 'created_at']
    list_filter = ['created_at', 'overall_score']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

@admin.register(CategoryScore)
class CategoryScoreAdmin(admin.ModelAdmin):
    list_display = ['questionnaire_result', 'category_name', 'category_score', 'category_number']
    list_filter = ['category_name', 'category_score']
    search_fields = ['category_name', 'questionnaire_result__user__username']
    ordering = ['questionnaire_result', 'category_number']

@admin.register(QuestionResponse)
class QuestionResponseAdmin(admin.ModelAdmin):
    list_display = ['questionnaire_result', 'category_number', 'question_number', 'response']
    list_filter = ['response', 'category_number']
    search_fields = ['question_text', 'questionnaire_result__user__username']
    ordering = ['questionnaire_result', 'category_number', 'question_number']

# Register legacy models if they exist
# admin.site.register(Question)
# admin.site.register(Answer)
# admin.site.register(Category)
# admin.site.register(SubCategory)
# admin.site.register(Assessment)

