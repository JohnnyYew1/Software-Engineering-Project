from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from django.db.models import Max
from django.db import transaction, IntegrityError, connection

import mimetypes
import os
import urllib.parse
import traceback

from .models import Asset, Tag, UserProfile, AssetVersion
from .serializers import (
    AssetSerializer,
    TagSerializer,
    UserProfileSerializer,
    AssetVersionSerializer,
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


# ---------------- Assets ----------------
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related("uploaded_by").prefetch_related("tags")
    serializer_class = AssetSerializer
    permission_classes = [AssetPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # 搜索字段
    search_fields = ["name", "description", "tags__name"]

    # 支持的过滤（保持你原本逻辑）
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

    # 角色判定（admin/editor 才能写）
    def _role(self, user):
        return getattr(getattr(user, "userprofile", None), "role", "viewer").lower()

    # tag 名称过滤 + 多 tag id 过滤 + 日期范围（保留你原逻辑）
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

        # 支持 ?tags=1&tags=2
        tag_ids = q.getlist("tags")
        if tag_ids:
            try:
                ids = [int(x) for x in tag_ids if str(x).isdigit()]
                if ids:
                    qs = qs.filter(tags__id__in=ids).distinct()
            except ValueError:
                pass

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

        # 推断下载文件名
        base_name = (asset.name or os.path.basename(asset.file.name)).strip()
        root, ext = os.path.splitext(base_name)
        if not ext:
            _, real_ext = os.path.splitext(asset.file.name)
            base_name = (root or os.path.splitext(os.path.basename(asset.file.name))[0]) + (real_ext or "")

        mime, _ = mimetypes.guess_type(asset.file.name)
        mime = mime or "application/octet-stream"

        # 计数
        asset.download_count = (asset.download_count or 0) + 1
        asset.save(update_fields=["download_count"])

        # 返回文件（暴露必要响应头，前端可读取文件名/长度）
        fh = asset.file.open("rb")
        resp = FileResponse(fh, as_attachment=True, filename=base_name)
        resp["Content-Type"] = mime
        resp["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Length"
        quoted = urllib.parse.quote(base_name)
        resp["Content-Disposition"] = f"attachment; filename*=UTF-8''{quoted}"
        try:
            size = getattr(asset.file, "size", None)
            if size is None and hasattr(asset.file, "path"):
                size = os.path.getsize(asset.file.path)
            if size is not None:
                resp["Content-Length"] = str(size)
        except Exception:
            pass
        return resp

    # ----------------- 版本历史：合并 GET 列表 & POST 上传 -----------------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated], url_path="versions")
    def versions(self, request, pk=None):
        asset = self.get_object()

        # GET：列表（最新在最上）
        if request.method.lower() == "get":
            qs = asset.versions.select_related("uploaded_by").all().order_by("-version", "-created_at")
            ser = AssetVersionSerializer(qs, many=True, context={"request": request})
            return Response(ser.data)

        # POST：上传新版本（key='file'，可选 'note'）
        if self._role(request.user) not in ("admin", "editor"):
            return Response({"detail": "Permission denied."}, status=403)

        uploaded_file = (
            request.FILES.get("file")
            or request.FILES.get("version_file")
            or request.FILES.get("upload")
            or request.FILES.get("asset")
            or (next(iter(request.FILES.values())) if request.FILES else None)
        )
        note = request.data.get("note") or request.data.get("version_note") or ""

        if not uploaded_file:
            return Response({
                "detail": "No file in multipart form-data.",
                "hint": "Use FormData and append with key 'file'.",
                "received_keys": list(request.FILES.keys()),
            }, status=400)

        try:
            with transaction.atomic():
                last = asset.versions.aggregate(mx=Max("version")).get("mx") or 0
                new_ver = int(last) + 1
                try:
                    v = AssetVersion.objects.create(
                        asset=asset,
                        version=new_ver,
                        file=uploaded_file,
                        uploaded_by=request.user,
                        note=note.strip() or None,
                    )
                except Exception as inner:
                    # 兼容数据库曾缺少 note 列的场景
                    msg = str(inner).lower()
                    if "column \"note\"" in msg or "column 'note'" in msg or "note does not exist" in msg:
                        relpath = getattr(uploaded_file, "name", str(uploaded_file))
                        with connection.cursor() as cur:
                            cur.execute(
                                """
                                INSERT INTO myassets_assetversion
                                    (asset_id, version, file, uploaded_by_id, created_at)
                                VALUES (%s, %s, %s, %s, NOW())
                                RETURNING id
                                """,
                                [asset.id, new_ver, relpath, getattr(request.user, "id", None)],
                            )
                            new_id = cur.fetchone()[0]
                        v = AssetVersion.objects.get(pk=new_id)
                    else:
                        raise

                # 同步把 Asset 当前文件指向最新版本
                asset.file = v.file
                asset.save(update_fields=["file"])

        except IntegrityError:
            return Response({"detail": "Version conflict. Please retry."}, status=409)
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": f"Upload failed: {str(e)}"}, status=400)

        ser = AssetVersionSerializer(v, context={"request": request})
        return Response(ser.data, status=201)

    # 最新版本
    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="versions/latest")
    def latest_version(self, request, pk=None):
        asset = self.get_object()
        ver = asset.versions.select_related("uploaded_by").order_by("-version", "-created_at").first()
        if not ver:
            return Response({"detail": "No versions"}, status=404)
        ser = AssetVersionSerializer(ver, context={"request": request})
        return Response(ser.data)

    # 回滚：/api/assets/:id/versions/<ver>/restore/
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path=r"versions/(?P<ver>\d+)/restore"
    )
    def restore_version_nested(self, request, pk=None, ver=None):
        if self._role(request.user) not in ("admin", "editor"):
            return Response({"detail": "Permission denied."}, status=403)

        asset = self.get_object()
        try:
            ver_num = int(ver)
        except Exception:
            return Response({"detail": "Invalid version"}, status=400)

        target = asset.versions.filter(version=ver_num).first()
        if not target:
            return Response({"detail": "Version not found"}, status=404)

        with transaction.atomic():
            last = asset.versions.aggregate(mx=Max("version")).get("mx") or 0
            new_ver = int(last) + 1
            new_v = AssetVersion.objects.create(
                asset=asset,
                version=new_ver,
                file=target.file,
                note=f"restore to v{ver_num}",
                uploaded_by=request.user,
            )
            asset.file = new_v.file
            asset.save(update_fields=["file"])

        ser = AssetVersionSerializer(new_v, context={"request": request})
        return Response(ser.data, status=201)

    # 兼容旧回滚：/api/assets/:id/restore_version/?version=#
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="restore_version")
    def restore_version_query(self, request, pk=None):
        if self._role(request.user) not in ("admin", "editor"):
            return Response({"detail": "Permission denied."}, status=403)
        ver = request.query_params.get("version")
        if not ver:
            return Response({"detail": "Missing version"}, status=400)
        return self.restore_version_nested(request, pk, ver)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
