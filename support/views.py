from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.permissions import IsAdmin, IsAdminOrReadOnly, is_admin
from .filters import HelpContactFilter, LegalQuestionFilter
from .models import HelpContact, LegalQuestion
from .serializers import HelpContactSerializer, LegalAnswerSerializer, LegalQuestionSerializer


class HelpContactViewSet(viewsets.ModelViewSet):
    """Help contacts: everyone reads the active ones, admins manage them."""

    serializer_class = HelpContactSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = HelpContactFilter

    def get_queryset(self):
        contacts = HelpContact.objects.select_related("region")
        return contacts if is_admin(self.request.user) else contacts.filter(is_active=True)


class LegalQuestionViewSet(viewsets.ModelViewSet):
    """A worker sees and asks their own questions; admins see all of them and answer with POST .../answer/."""

    serializer_class = LegalQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = LegalQuestionFilter

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return LegalQuestion.objects.none()
        questions = LegalQuestion.objects.select_related("document_type")
        return questions if is_admin(self.request.user) else questions.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # The question can be corrected only until the lawyer answers it.
        if serializer.instance.status != "new":
            raise PermissionDenied("The question already has an answer and can not be changed.")
        serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin], serializer_class=LegalAnswerSerializer)
    def answer(self, request, pk=None):
        question = self.get_object()
        data = LegalAnswerSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if data.validated_data.get("answer"):
            question.save_answer(data.validated_data["answer"], request.user)
        if data.validated_data.get("status"):
            question.status = data.validated_data["status"]
            question.save(update_fields=["status"])
        return Response(LegalQuestionSerializer(question).data)
