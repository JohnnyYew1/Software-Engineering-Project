from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"assets", views.AssetViewSet, basename="asset")
router.register(r"tags", views.TagViewSet, basename="tag")
router.register(r"userprofiles", views.UserProfileViewSet, basename="userprofile")

urlpatterns = [
    path("", include(router.urls)),
    path("csrf/", views.csrf, name="csrf"),               # ✅ CSRF 种 cookie
    path("login/", views.user_login, name="login"),
    path("logout/", views.user_logout, name="logout"),
    path("current-user/", views.get_current_user, name="current_user"),
    path("me/", views.get_current_user, name="me"),       # 兼容 /api/me/
]
