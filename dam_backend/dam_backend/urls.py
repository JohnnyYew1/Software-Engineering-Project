# dam_backend/urls.py  —— 项目根 URLConf（最简、权责清晰）
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# SimpleJWT（前端 JWT 登录/刷新用）
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 统一把 /api/* 都交给 myassets 应用
    path('api/', include('myassets.urls')),
]

# 媒体文件（预览/下载）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
