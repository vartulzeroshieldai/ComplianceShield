# questionnaire/serializers.py
# Description: Defines the API serialization for the questionnaire models.
# UPDATED: Comprehensive serializers for questionnaire results and scoring

from rest_framework import serializers
from .models import QuestionnaireResult, CategoryScore, QuestionResponse

class QuestionResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for individual question responses
    """
    class Meta:
        model = QuestionResponse
        fields = [
            'id', 'category_number', 'question_number', 
            'question_text', 'response'
        ]
        read_only_fields = ['id']

class CategoryScoreSerializer(serializers.ModelSerializer):
    """
    Serializer for category scores and breakdowns
    """
    class Meta:
        model = CategoryScore
        fields = [
            'id', 'category_name', 'category_number', 'category_score',
            'total_questions', 'met_count', 'not_met_count', 
            'not_applicable_count', 'applicable_questions'
        ]
        read_only_fields = ['id']

class QuestionnaireResultSerializer(serializers.ModelSerializer):
    """
    Serializer for questionnaire results with nested category scores and responses
    """
    category_scores = CategoryScoreSerializer(many=True, read_only=True)
    question_responses = QuestionResponseSerializer(many=True, read_only=True)
    user = serializers.ReadOnlyField(source='user.username')
    user_id = serializers.ReadOnlyField(source='user.id')
    
    class Meta:
        model = QuestionnaireResult
        fields = [
            'id', 'user', 'user_id', 'overall_score', 'total_questions',
            'met_count', 'not_met_count', 'not_applicable_count', 
            'applicable_questions', 'created_at', 'updated_at',
            'raw_responses', 'calculated_scores', 'category_scores', 
            'question_responses'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class QuestionnaireResultListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing questionnaire results
    """
    user = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = QuestionnaireResult
        fields = [
            'id', 'user', 'overall_score', 'total_questions',
            'met_count', 'not_met_count', 'not_applicable_count',
            'applicable_questions', 'created_at'
        ]

class QuestionnaireSubmissionSerializer(serializers.Serializer):
    """
    Serializer for submitting questionnaire data from frontend
    """
    responses = serializers.JSONField(help_text="Question responses in format: {sectionIdx-questionIdx: response}")
    scores = serializers.JSONField(help_text="Calculated scores from frontend")
    sections = serializers.JSONField(help_text="Question sections data", required=False)
    
    def validate_responses(self, value):
        """
        Validate that responses are in the correct format
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Responses must be a dictionary")
        
        valid_responses = ['Met', 'Not Met', 'Not Applicable']
        for key, response in value.items():
            if response not in valid_responses:
                raise serializers.ValidationError(
                    f"Invalid response '{response}' for question {key}. "
                    f"Must be one of: {', '.join(valid_responses)}"
                )
        
        return value
    
    def validate_scores(self, value):
        """
        Validate that scores contain required fields
        """
        required_fields = ['overall', 'categoryScores']
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f"Missing required field: {field}")
        
        # Validate overall score structure
        overall = value['overall']
        required_overall_fields = ['percentage', 'met', 'notMet', 'notApplicable', 'total']
        for field in required_overall_fields:
            if field not in overall:
                raise serializers.ValidationError(f"Missing required overall field: {field}")
        
        return value

class QuestionnaireStatsSerializer(serializers.Serializer):
    """
    Serializer for questionnaire statistics and analytics
    """
    total_submissions = serializers.IntegerField()
    average_score = serializers.FloatField()
    highest_score = serializers.IntegerField()
    lowest_score = serializers.IntegerField()
    recent_submissions = QuestionnaireResultListSerializer(many=True)
    category_averages = serializers.JSONField()
    score_distribution = serializers.JSONField()
