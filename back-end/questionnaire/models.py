# questionnaire/models.py
# Description: Defines the database models for the questionnaire application.
# UPDATED: Comprehensive models for storing questionnaire results with detailed scoring

from django.db import models
from django.conf import settings
from django.utils import timezone
import json

class QuestionnaireResult(models.Model):
    """
    Main model to store questionnaire results with overall scoring
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='questionnaire_results'
    )
    
    # Overall scoring data
    overall_score = models.IntegerField(help_text="Overall percentage score")
    total_questions = models.IntegerField(help_text="Total number of questions")
    met_count = models.IntegerField(help_text="Number of 'Met' responses")
    not_met_count = models.IntegerField(help_text="Number of 'Not Met' responses")
    not_applicable_count = models.IntegerField(help_text="Number of 'Not Applicable' responses")
    applicable_questions = models.IntegerField(help_text="Total applicable questions (Met + Not Met)")
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional: Store raw responses as JSON for detailed analysis
    raw_responses = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Raw question responses stored as JSON"
    )
    
    # Optional: Store calculated scores as JSON for easy retrieval
    calculated_scores = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="All calculated scores stored as JSON"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Questionnaire Result"
        verbose_name_plural = "Questionnaire Results"
    
    def __str__(self):
        return f"{self.user.username} - {self.overall_score}% - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

class CategoryScore(models.Model):
    """
    Model to store individual category scores and breakdowns
    """
    questionnaire_result = models.ForeignKey(
        QuestionnaireResult, 
        on_delete=models.CASCADE, 
        related_name='category_scores'
    )
    
    category_name = models.CharField(max_length=200, help_text="Name of the category")
    category_number = models.IntegerField(help_text="Category number/order")
    
    # Category scoring data
    category_score = models.IntegerField(help_text="Category percentage score")
    total_questions = models.IntegerField(help_text="Total questions in this category")
    met_count = models.IntegerField(help_text="Number of 'Met' responses in this category")
    not_met_count = models.IntegerField(help_text="Number of 'Not Met' responses in this category")
    not_applicable_count = models.IntegerField(help_text="Number of 'Not Applicable' responses in this category")
    applicable_questions = models.IntegerField(help_text="Applicable questions in this category")
    
    class Meta:
        ordering = ['category_number']
        unique_together = ['questionnaire_result', 'category_number']
        verbose_name = "Category Score"
        verbose_name_plural = "Category Scores"
    
    def __str__(self):
        return f"{self.questionnaire_result.user.username} - {self.category_name} - {self.category_score}%"

class QuestionResponse(models.Model):
    """
    Model to store individual question responses for detailed analysis
    """
    RESPONSE_CHOICES = [
        ('Met', 'Met'),
        ('Not Met', 'Not Met'),
        ('Not Applicable', 'Not Applicable'),
    ]
    
    questionnaire_result = models.ForeignKey(
        QuestionnaireResult, 
        on_delete=models.CASCADE, 
        related_name='question_responses'
    )
    
    category_number = models.IntegerField(help_text="Category number this question belongs to")
    question_number = models.IntegerField(help_text="Question number within the category")
    question_text = models.TextField(help_text="Full text of the question")
    
    response = models.CharField(
        max_length=20, 
        choices=RESPONSE_CHOICES, 
        help_text="User's response to the question"
    )
    
    class Meta:
        ordering = ['category_number', 'question_number']
        unique_together = ['questionnaire_result', 'category_number', 'question_number']
        verbose_name = "Question Response"
        verbose_name_plural = "Question Responses"
    
    def __str__(self):
        return f"{self.questionnaire_result.user.username} - Q{self.category_number}.{self.question_number} - {self.response}"

# Legacy model for backward compatibility
class questionnaire_result(models.Model):
    """
    Legacy model - kept for backward compatibility
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='legacy_questionnaire_results')
    score = models.IntegerField()
    
    class Meta:
        db_table = 'questionnaire_questionnaire_result'  # Use different table name to avoid conflicts