from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import requests

@api_view(["POST"])
@permission_classes([AllowAny])
def chat_with_rasa(request):
    user_message = request.data.get("message", "")
    if not user_message:
        return Response([{"text": "⚠️ No message received"}])

    try:
        rasa_response = requests.post(
            "http://localhost:5005/webhooks/rest/webhook",
            json={"sender": "user", "message": user_message},
        )
        return Response(rasa_response.json())
    except Exception as e:
        return Response([{"text": f"⚠️ Error: {str(e)}"}])
