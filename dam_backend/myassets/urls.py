# myassets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'assets', views.AssetViewSet, basename='asset')
router.register(r'tags', views.TagViewSet, basename='tag')
router.register(r'userprofiles', views.UserProfileViewSet, basename='userprofile')

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),
    path('current-user/', views.get_current_user, name='current_user'),
    path('debug-routes/', views.debug_routes, name='debug_routes'),  # 添加调试端点
    path('test-assets-basic/', views.test_assets_basic, name='test_assets_basic'),
]