# dam_backend/myassets/views.py
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, FileResponse
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

import mimetypes
import os
import urllib.parse

from .models import Asset, Tag, UserProfile
from .serializers import AssetSerializer, TagSerializer, UserProfileSerializer
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


# ---------------- 资源 ----------------
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related("uploaded_by").prefetch_related("tags")
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

    # 新增：按标签“名称”过滤，使用 tag_names=logo,product
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

        # ✅ 新增：Tag ID 多选（OR 逻辑）支持 ?tags=1&tags=2
        tag_ids = q.getlist("tags")
        if tag_ids:
            try:
                ids = [int(x) for x in tag_ids if str(x).isdigit()]
                if ids:
                    qs = qs.filter(tags__id__in=ids).distinct()
            except ValueError:
                pass  # 忽略非法值，避免 400

        # 你原来的“按名称过滤”
        if tag_names_csv:
            names = [t.strip() for t in tag_names_csv.split(",") if t.strip()]
            if names:
                qs = qs.filter(tags__name__in=names).distinct()

        return qs


    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

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


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
