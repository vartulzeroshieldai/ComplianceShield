# questionnaire/views.py
# Description: Defines the API views (endpoints) for the application.
# UPDATED: Added comprehensive questionnaire result views and analytics

from rest_framework import viewsets, mixins, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Max, Min, Count
from django.utils import timezone
from datetime import timedelta
from .models import (
    # Legacy models (commented out since they don't exist)
    # Category, Question, Assessment, Answer,
    # New models
    QuestionnaireResult, CategoryScore, QuestionResponse
)
from .serializers import (
    # Legacy serializers (commented out since models don't exist)
    # CategorySerializer, 
    # AssessmentListSerializer, 
    # AssessmentDetailSerializer,
    # AnswerSerializer,
    # New serializers
    QuestionnaireResultSerializer,
    QuestionnaireResultListSerializer,
    QuestionnaireSubmissionSerializer,
    QuestionnaireStatsSerializer,
    CategoryScoreSerializer,
    QuestionResponseSerializer
)

# Legacy viewsets commented out since models don't exist
# class CategoryViewSet(mixins.ListModelMixin,
#                       mixins.RetrieveModelMixin,
#                       viewsets.GenericViewSet):
#     """
#     A read-only API endpoint for viewing the full questionnaire structure.
#     """
#     permission_classes = [permissions.IsAuthenticated]
#     
#     # --- THIS IS THE FIX ---
#     # The prefetch path is now updated to follow the new relationship:
#     # Category -> subcategories -> questions
#     queryset = Category.objects.prefetch_related('subcategories__questions').all()
#     # --- END OF FIX ---
#     
#     serializer_class = CategorySerializer

# class AssessmentViewSet(viewsets.ModelViewSet):
#     """
#     A viewset for viewing and creating assessments.
#     """
#     serializer_class = AssessmentListSerializer

#     def get_queryset(self):
#         """
#         This view should only return assessments for the
#         currently authenticated user.
#         """
#         user = self.request.user
#         return Assessment.objects.filter(user=user)

#     def perform_create(self, serializer):
#         """
#         Automatically assign the logged-in user to the assessment
#         and create all pending answers.
#         """
#         assessment = serializer.save(user=self.request.user)
#         all_questions = Question.objects.all()
#         answers_to_create = [
#             Answer(assessment=assessment, question=question)
#             for question in all_questions
#         ]
#         Answer.objects.bulk_create(answers_to_create)

#     def get_serializer_class(self):
#         if self.action == 'retrieve' or self.action == 'create':
#             return AssessmentDetailSerializer
#         return AssessmentListSerializer

#     @action(detail=True, methods=['get', 'put'], url_path='answers/(?P<answer_pk>[^/.]+)')
#     def answer(self, request, pk=None, answer_pk=None):
#         assessment = self.get_object()
#         try:
#             answer_instance = assessment.answers.get(pk=answer_pk)
#         except Answer.DoesNotExist:
#             return Response({'error': 'Answer not found.'}, status=404)

#         if request.method == 'GET':
#             serializer = AnswerSerializer(answer_instance)
#             return Response(serializer.data)
#         elif request.method == 'PUT':
#             serializer = AnswerSerializer(answer_instance, data=request.data)
#             if serializer.is_valid():
#                 serializer.save()
#                 return Response(serializer.data)
#             return Response(serializer.errors, status=400)


# New Questionnaire Result Views

class QuestionnaireResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire results
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return questionnaire results for the authenticated user
        """
        return QuestionnaireResult.objects.filter(user=self.request.user).prefetch_related(
            'category_scores', 'question_responses'
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return QuestionnaireResultListSerializer
        return QuestionnaireResultSerializer

    def perform_create(self, serializer):
        """
        Automatically assign the logged-in user to the questionnaire result
        """
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def detailed_scores(self, request, pk=None):
        """
        Get detailed breakdown of scores for a specific questionnaire result
        """
        questionnaire_result = self.get_object()
        
        # Get category scores
        category_scores = CategoryScore.objects.filter(
            questionnaire_result=questionnaire_result
        ).order_by('category_number')
        
        # Get question responses
        question_responses = QuestionResponse.objects.filter(
            questionnaire_result=questionnaire_result
        ).order_by('category_number', 'question_number')
        
        return Response({
            'questionnaire_result': QuestionnaireResultSerializer(questionnaire_result).data,
            'category_scores': CategoryScoreSerializer(category_scores, many=True).data,
            'question_responses': QuestionResponseSerializer(question_responses, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get statistics for the user's questionnaire results
        """
        user_results = QuestionnaireResult.objects.filter(user=request.user)
        
        if not user_results.exists():
            return Response({
                'total_submissions': 0,
                'average_score': 0,
                'highest_score': 0,
                'lowest_score': 0,
                'recent_submissions': [],
                'category_averages': {},
                'score_distribution': {}
            })
        
        # Calculate basic stats
        total_submissions = user_results.count()
        average_score = user_results.aggregate(avg=Avg('overall_score'))['avg'] or 0
        highest_score = user_results.aggregate(max=Max('overall_score'))['max'] or 0
        lowest_score = user_results.aggregate(min=Min('overall_score'))['min'] or 0
        
        # Get recent submissions (last 5)
        recent_submissions = user_results.order_by('-created_at')[:5]
        
        # Calculate category averages
        category_averages = {}
        for category_score in CategoryScore.objects.filter(
            questionnaire_result__user=request.user
        ).values('category_name').annotate(
            avg_score=Avg('category_score')
        ):
            category_averages[category_score['category_name']] = round(
                category_score['avg_score'], 2
            )
        
        # Calculate score distribution
        score_ranges = {
            '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
        }
        
        for result in user_results:
            score = result.overall_score
            if score <= 20:
                score_ranges['0-20'] += 1
            elif score <= 40:
                score_ranges['21-40'] += 1
            elif score <= 60:
                score_ranges['41-60'] += 1
            elif score <= 80:
                score_ranges['61-80'] += 1
            else:
                score_ranges['81-100'] += 1
        
        return Response({
            'total_submissions': total_submissions,
            'average_score': round(average_score, 2),
            'highest_score': highest_score,
            'lowest_score': lowest_score,
            'recent_submissions': QuestionnaireResultListSerializer(
                recent_submissions, many=True
            ).data,
            'category_averages': category_averages,
            'score_distribution': score_ranges
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_questionnaire(request):
    """
    Submit questionnaire results from frontend
    """
    serializer = QuestionnaireSubmissionSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Extract data from validated serializer
        responses = serializer.validated_data['responses']
        scores = serializer.validated_data['scores']
        sections = serializer.validated_data.get('sections', [])
        
        # Create main questionnaire result
        overall_data = scores['overall']
        questionnaire_result = QuestionnaireResult.objects.create(
            user=request.user,
            overall_score=overall_data['percentage'],
            total_questions=overall_data['total'],
            met_count=overall_data['met'],
            not_met_count=overall_data['notMet'],
            not_applicable_count=overall_data['notApplicable'],
            applicable_questions=overall_data['met'] + overall_data['notMet'],
            raw_responses=responses,
            calculated_scores=scores
        )
        
        # Create category scores
        category_scores_data = scores['categoryScores']
        for category_name, category_data in category_scores_data.items():
            # Extract category number from sections if available
            category_number = 1
            if sections:
                for i, section in enumerate(sections):
                    if section.get('heading') == category_name:
                        category_number = i + 1
                        break
            
            CategoryScore.objects.create(
                questionnaire_result=questionnaire_result,
                category_name=category_name,
                category_number=category_number,
                category_score=category_data['percentage'],
                total_questions=category_data['total'],
                met_count=category_data['met'],
                not_met_count=category_data['notMet'],
                not_applicable_count=category_data['notApplicable'],
                applicable_questions=category_data['applicableQuestions']
            )
        
        # Create individual question responses
        if sections:
            for section_idx, section in enumerate(sections):
                category_name = section.get('heading', f'Category {section_idx + 1}')
                questions = section.get('questions', [])
                
                for question_idx, question_text in enumerate(questions):
                    response_key = f"{section_idx}-{question_idx}"
                    if response_key in responses:
                        QuestionResponse.objects.create(
                            questionnaire_result=questionnaire_result,
                            category_number=section_idx + 1,
                            question_number=question_idx + 1,
                            question_text=question_text,
                            response=responses[response_key]
                        )
        
        # Return the created result
        result_serializer = QuestionnaireResultSerializer(questionnaire_result)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to save questionnaire: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def questionnaire_analytics(request):
    """
    Get comprehensive analytics for questionnaire results
    """
    user_results = QuestionnaireResult.objects.filter(user=request.user)
    
    if not user_results.exists():
        return Response({
            'message': 'No questionnaire results found',
            'analytics': {}
        })
    
    # Time-based analytics
    now = timezone.now()
    last_week = now - timedelta(days=7)
    last_month = now - timedelta(days=30)
    
    recent_results = user_results.filter(created_at__gte=last_week)
    monthly_results = user_results.filter(created_at__gte=last_month)
    
    # Calculate trends
    if user_results.count() >= 2:
        latest_score = user_results.order_by('-created_at').first().overall_score
        previous_score = user_results.order_by('-created_at')[1].overall_score
        score_trend = latest_score - previous_score
    else:
        score_trend = 0
    
    # Category performance analysis
    category_performance = {}
    for category_score in CategoryScore.objects.filter(
        questionnaire_result__user=request.user
    ).values('category_name').annotate(
        avg_score=Avg('category_score'),
        count=Count('id')
    ):
        category_performance[category_score['category_name']] = {
            'average_score': round(category_score['avg_score'], 2),
            'submissions_count': category_score['count']
        }
    
    # Response pattern analysis
    response_patterns = {
        'met_percentage': 0,
        'not_met_percentage': 0,
        'not_applicable_percentage': 0
    }
    
    total_responses = QuestionResponse.objects.filter(
        questionnaire_result__user=request.user
    ).count()
    
    if total_responses > 0:
        met_count = QuestionResponse.objects.filter(
            questionnaire_result__user=request.user,
            response='Met'
        ).count()
        not_met_count = QuestionResponse.objects.filter(
            questionnaire_result__user=request.user,
            response='Not Met'
        ).count()
        not_applicable_count = QuestionResponse.objects.filter(
            questionnaire_result__user=request.user,
            response='Not Applicable'
        ).count()
        
        response_patterns = {
            'met_percentage': round((met_count / total_responses) * 100, 2),
            'not_met_percentage': round((not_met_count / total_responses) * 100, 2),
            'not_applicable_percentage': round((not_applicable_count / total_responses) * 100, 2)
        }
    
    return Response({
        'analytics': {
            'total_submissions': user_results.count(),
            'recent_submissions': recent_results.count(),
            'monthly_submissions': monthly_results.count(),
            'average_score': round(user_results.aggregate(avg=Avg('overall_score'))['avg'] or 0, 2),
            'highest_score': user_results.aggregate(max=Max('overall_score'))['max'] or 0,
            'lowest_score': user_results.aggregate(min=Min('overall_score'))['min'] or 0,
            'score_trend': score_trend,
            'category_performance': category_performance,
            'response_patterns': response_patterns,
            'last_submission': user_results.order_by('-created_at').first().created_at.isoformat() if user_results.exists() else None
        }
    })
