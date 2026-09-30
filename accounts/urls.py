from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LogoutView, NotificationViewSet, ProfileView, SendCodeView, TelegramView, VerifyCodeView

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("send-code/", SendCodeView.as_view(), name="send-code"),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("telegram/", TelegramView.as_view(), name="telegram"),
    path("", include(router.urls)),
]
