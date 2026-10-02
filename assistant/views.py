from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .knowledge import system_prompt
from .providers import AssistantError, active_provider, ask

LANGUAGE_NAMES = {"ru": "Russian", "tg": "Tajik"}
MAX_HISTORY = 20  # messages sent back to the model; older ones are dropped


class ChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000, trim_whitespace=True)


class ChatSerializer(serializers.Serializer):
    messages = ChatMessageSerializer(many=True, allow_empty=False)
    page = serializers.CharField(max_length=200, required=False, allow_blank=True)  # where the visitor is now

    def validate_messages(self, messages):
        messages = messages[-MAX_HISTORY:]
        while messages and messages[0]["role"] != "user":
            messages = messages[1:]
        if not messages or messages[-1]["role"] != "user":
            raise serializers.ValidationError("The last message must be from the user.")
        if len(messages[-1]["content"]) > 1000:
            raise serializers.ValidationError("The question is too long (1000 characters at most).")
        return messages


def site_language(request):
    if request.user.is_authenticated and request.user.language in LANGUAGE_NAMES:
        return request.user.language
    header = (request.headers.get("Accept-Language") or "").lower()
    return "ru" if header.startswith("ru") else "tg"


class AssistantView(APIView):
    """AI assistant of the site: answers about migration and the site, and opens pages for the visitor.

    GET tells whether the assistant is set up; POST sends the conversation and returns
    {"reply", "navigate" (a page address to open, or null), "refused", "truncated"}."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "assistant"

    def get_throttles(self):
        # Only questions are limited; checking the status is free.
        return [*super().get_throttles(), ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        return Response({"enabled": active_provider() is not None})

    @swagger_auto_schema(request_body=ChatSerializer)
    def post(self, request):
        serializer = ChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if active_provider() is None:
            return Response({"code": "not_configured", "detail": "The AI assistant is not set up yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user = request.user
        visitor_note = (
            f"Site language of this visitor: {LANGUAGE_NAMES[site_language(request)]}. "
            f"Logged in: {'yes, ' + (user.full_name or 'no name') if user.is_authenticated else 'no'}. "
            f"Current page: {serializer.validated_data.get('page') or '/'}."
        )
        messages = [{"role": m["role"], "content": m["content"]} for m in serializer.validated_data["messages"]]
        try:
            return Response(ask(system_prompt(), visitor_note, messages, user if user.is_authenticated else None))
        except AssistantError as error:
            return Response({"code": error.code, "detail": error.detail}, status=error.http_status)
