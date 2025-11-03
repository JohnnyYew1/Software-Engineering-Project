from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.db.models import Max

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

import mimetypes
import os
import urllib.parse

from .models import Asset, Tag, UserProfile, AssetVersion
from .serializers import (
    AssetSerializer,
    TagSerializer,
    UserProfileSerializer,
    AssetVersionListSerializer,
    AssetVersionCreateSerializer,
)
from .permissions import AssetPermission


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"ok": True})


# ---------------- Auth ----------------
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


# 小工具：获取用户角色（小写）
def _get_role(user) -> str:
    try:
        r = user.userprofile.role
    except Exception:
        r = getattr(user, "role", "viewer")
    return (r or "viewer").lower()


# ---------------- 资源 ----------------
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related("uploaded_by").prefetch_related("tags").order_by("-upload_date")
    serializer_class = AssetSerializer
    permission_classes = [AssetPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # 搜索字段
    search_fields = ["name", "description", "tags__name"]

    # 这里保留对 tags（ID）的 exact/in 过滤
    filterset_fields = {
        "asset_type": ["exact"],
        "uploaded_by": ["exact"],
        "upload_date": ["exact", "gte", "lte"],
    }

    ordering_fields = ["upload_date", "name", "download_count", "view_count"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    # 按标签“名称”过滤：tag_names=logo,product；支持 ?tags=1&tags=2；支持 date_from/date_to
    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params

        date_from = q.get("date_from")
        date_to = q.get("date_to")
        tag_names_csv = q.get("tag_names")

        if date_from:
            qs = qs.filter(upload_date__date__gte=date_from)
        if date_to:
            qs = qs.filter(upload_date__date__lte=date_to)

        # ✅ Tag ID 多选（OR 逻辑）支持 ?tags=1&tags=2
        tag_ids = q.getlist("tags")
        if tag_ids:
            try:
                ids = [int(x) for x in tag_ids if str(x).isdigit()]
                if ids:
                    qs = qs.filter(tags__id__in=ids).distinct()
            except ValueError:
                pass  # 忽略非法值，避免 400

        # ✅ 按名称过滤：tag_names=logo,product
        if tag_names_csv:
            names = [t.strip() for t in tag_names_csv.split(",") if t.strip()]
            if names:
                qs = qs.filter(tags__name__in=names).distinct()

        return qs

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    # -------- 预览 / 下载（保持你的原逻辑） --------
    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def preview(self, request, pk=None):
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)
        return Response({"file_url": request.build_absolute_uri(asset.file.url)})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def download_url(self, request, pk=None):
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)
        return Response({"url": request.build_absolute_uri(asset.file.url)})

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="download")
    def download(self, request, pk=None):
        asset = self.get_object()
        if not asset.file:
            return Response({"detail": "No file"}, status=404)

        base_name = (asset.name or os.path.basename(asset.file.name)).strip()
        root, ext = os.path.splitext(base_name)
        if not ext:
            _, real_ext = os.path.splitext(asset.file.name)
            base_name = root + real_ext

        mime, _ = mimetypes.guess_type(asset.file.name)
        mime = mime or "application/octet-stream"

        asset.download_count = (asset.download_count or 0) + 1
        asset.save(update_fields=["download_count"])

        resp = FileResponse(asset.file.open("rb"), as_attachment=True, filename=base_name)
        resp["Content-Type"] = mime
        quoted = urllib.parse.quote(base_name)
        resp["Content-Disposition"] = f"attachment; filename*=UTF-8''{quoted}"
        return resp

    # -------- 版本历史（新增，最小侵入） --------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated], url_path="versions")
    def versions(self, request, pk=None):
        """
        GET  /assets/{id}/versions/     -> 列出版本（按 version desc）
        POST /assets/{id}/versions/     -> 上传新版本（Admin/Editor）
        """
        asset = self.get_object()

        if request.method.lower() == "get":
            qs = AssetVersion.objects.filter(asset=asset).order_by("-version", "-uploaded_at")
            data = AssetVersionListSerializer(qs, many=True).data
            return Response(data)

        # POST: 仅 admin/editor 允许
        role = _get_role(request.user)
        if role not in ("admin", "editor"):
            return Response({"detail": "权限不足，仅 Admin/Editor 可上传新版本。"}, status=status.HTTP_403_FORBIDDEN)

        ser = AssetVersionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        maxv = AssetVersion.objects.filter(asset=asset).aggregate(m=Max("version")).get("m") or 0
        next_version = maxv + 1

        version = AssetVersion.objects.create(
            asset=asset,
            version=next_version,
            file=ser.validated_data["file"],
            uploaded_by=request.user,
            note=ser.validated_data.get("note", ""),
        )

        # 将主 Asset 的 file 指向最新版本，便于前端继续用当前文件预览
        asset.file = version.file
        asset.save(update_fields=["file"])

        return Response(AssetVersionListSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="versions/latest")
    def latest_version(self, request, pk=None):
        """
        GET /assets/{id}/versions/latest -> 返回最新版本
        """
        asset = self.get_object()
        latest = AssetVersion.objects.filter(asset=asset).order_by("-version", "-uploaded_at").first()
        if not latest:
            return Response({"detail": "暂无版本历史。"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AssetVersionListSerializer(latest).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path=r"versions/(?P<ver>\d+)/restore")
    def restore_version(self, request, pk=None, ver=None):
        """
        POST /assets/{id}/versions/{ver}/restore
        回滚到指定版本；并记录为一个新的“头部版本”（便于审计与前端统一）。
        """
        asset = self.get_object()
        role = _get_role(request.user)
        if role not in ("admin", "editor"):
            return Response({"detail": "权限不足，仅 Admin/Editor 可回滚版本。"}, status=status.HTTP_403_FORBIDDEN)

        target = get_object_or_404(AssetVersion, asset=asset, version=int(ver))

        # 主 Asset 指向该版本文件
        asset.file = target.file
        asset.save(update_fields=["file"])

        # 记录一次新的头部版本
        maxv = AssetVersion.objects.filter(asset=asset).aggregate(m=Max("version")).get("m") or 0
        new_head = AssetVersion.objects.create(
            asset=asset,
            version=maxv + 1,
            file=target.file,
            uploaded_by=request.user,
            note=f"restore from v{target.version}",
        )

        return Response(AssetVersionListSerializer(new_head).data, status=status.HTTP_200_OK)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
