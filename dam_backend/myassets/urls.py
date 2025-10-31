from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 创建路由器并注册视图集
router = DefaultRouter()
router.register(r'assets', views.AssetViewSet)
router.register(r'tags', views.TagViewSet)
router.register(r'userprofiles', views.UserProfileViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # 添加认证路由
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('current-user/', views.get_current_user, name='current_user'),
]