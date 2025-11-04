# myassets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .views import (
    csrf,
    user_login,
    user_logout,
    get_current_user,
    AssetViewSet,
    TagViewSet,
    UserProfileViewSet,
    AdminUserViewSet,
)

@api_view(["GET"])
@permission_classes([AllowAny])
def ping(request):
    return Response({"ok": True, "api_root": "/api is alive"})

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='assets')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'userprofiles', UserProfileViewSet, basename='userprofiles')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')  # ★ 用户管理

urlpatterns = [
    # 旧 session 登录系列（可选）
    path('csrf/', csrf),
    path('login/', user_login),
    path('logout/', user_logout),
    path('me/', get_current_user),

    # 健康探针
    path('ping/', ping),

    # 视图集
    path('', include(router.urls)),
]
