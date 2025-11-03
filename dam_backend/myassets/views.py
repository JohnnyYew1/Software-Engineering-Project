from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, FileResponse
import mimetypes
import os
import urllib.parse

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Asset, Tag, UserProfile
from .serializers import AssetSerializer, TagSerializer, UserProfileSerializer
from .permissions import AssetPermission  # ✅ 保留你自定义权限


@ensure_csrf_cookie
def csrf(request):
    """给前端种 CSRF Cookie（仅 Session 场景需要）"""
    return JsonResponse({"ok": True})


# ----------------------- Auth（兼容 Session / 保留） -----------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def user_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"success": False, "error": "Username and password are required."}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"success": False, "error": "Invalid credentials."}, status=401)
    login(request, user)
    role = getattr(getattr(user, "userprofile", None), "role", "viewer")
    return Response({
        "success": True,
        "user": {"id": user.id, "username": user.username, "role": role}
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_logout(request):
    logout(request)
    return Response({"success": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    role = getattr(getattr(user, "userprofile", None), "role", "viewer")
    return Response({
        "id": user.id,
        "username": user.username,
        "role": role,
        "is_active": user.is_active
    })


# ----------------------- 资源 -----------------------
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related("uploaded_by").prefetch_related("tags")
    serializer_class = AssetSerializer
    permission_classes = [AssetPermission]  # ✅ 使用你自定义权限
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    search_fields = ["name", "description", "tags__name"]

    # ✅ 仅保留模型真实字段；支持 upload_date 范围过滤
    filterset_fields = {
        "asset_type": ["exact"],        # '3d_model' | 'image' | 'video'
        "uploaded_by": ["exact"],
        "upload_date": ["exact", "gte", "lte"],
        "tags": ["exact"],
    }

    # ✅ 新增 download_count / view_count 供前端 Popular 等排序使用
    ordering_fields = ["upload_date", "name", "download_count", "view_count"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def preview(self, request, pk=None):
        """返回可预览的文件 URL（绝对地址）"""
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)
        return Response({"file_url": request.build_absolute_uri(asset.file.url)})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def download_url(self, request, pk=None):
        """
        兼容旧前端：返回直链（会在新标签打开，不一定触发保存）
        """
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)
        return Response({"url": request.build_absolute_uri(asset.file.url)})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="download")
    def download(self, request, pk=None):
        """
        ✅ 真正的「下载接口」：以附件形式返回二进制流，带 Content-Disposition。
        —— 前端用 fetch 携带凭证拿到 blob 后触发保存。
        """
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)

        # 计算文件名：优先用资产名，否则用文件名
        base_name = (asset.name or os.path.basename(asset.file.name)).strip()
        root, ext = os.path.splitext(base_name)
        if not ext:
            _, real_ext = os.path.splitext(asset.file.name)
            base_name = root + real_ext

        # MIME 类型
        mime, _ = mimetypes.guess_type(asset.file.name)
        mime = mime or "application/octet-stream"

        # 自增下载次数
        asset.download_count = (asset.download_count or 0) + 1
        asset.save(update_fields=["download_count"])

        # 以附件方式返回
        resp = FileResponse(asset.file.open("rb"), as_attachment=True, filename=base_name)
        resp["Content-Type"] = mime
        # 兼容 UTF-8 文件名（RFC 5987）
        quoted = urllib.parse.quote(base_name)
        resp["Content-Disposition"] = f"attachment; filename*=UTF-8''{quoted}"
        return resp

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def increase_download(self, request, pk=None):
        asset = self.get_object()
        asset.download_count = (asset.download_count or 0) + 1
        asset.save(update_fields=["download_count"])
        return Response({"download_count": asset.download_count})


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
