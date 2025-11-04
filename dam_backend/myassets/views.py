from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse, FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from django.db.models import Max, F, Count, Q
from django.db import transaction, IntegrityError, connection

from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .serializers import AdminUserReadSerializer, AdminUserWriteSerializer
from .permissions import IsAdminRole

from django.core.cache import cache  # ★ 新增：用于 view_count 去抖
import mimetypes
import os
import urllib.parse
import traceback
import re

from .models import Asset, Tag, UserProfile, AssetVersion
from .serializers import (
    AssetSerializer,
    TagSerializer,
    UserProfileSerializer,
    AssetVersionSerializer,
)
from .permissions import AssetPermission


User = get_user_model()

@api_view(["GET"])
@permission_classes([AllowAny])
def ping(request):
    return Response({"ok": True, "api_root": "/api/ is alive"})

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


# ---------------- 辅助 ----------------
def _client_ip(request) -> str:
    """简易获取客户端 IP（作业环境够用）"""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or "0.0.0.0"


def _role_of(user) -> str:
    return getattr(getattr(user, "userprofile", None), "role", "viewer").lower()


def _is_admin(user) -> bool:
    # 允许 Django 超级用户 或 userprofile.role == admin
    return bool(getattr(user, "is_superuser", False) or _role_of(user) == "admin")


# ---------------- Admin：用户管理 API（新增，不影响其它功能） ----------------
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_users(request):
    """
    GET  /api/admin/users/          -> 列出用户（含 role）
    POST /api/admin/users/          -> 创建用户（username, password, role=admin|editor|viewer, email 可选）
    """
    if not _is_admin(request.user):
        return Response({"detail": "Permission denied."}, status=403)

    if request.method == "GET":
        # 带出 role、is_active、date_joined
        profiles = {p.user_id: p.role for p in UserProfile.objects.all()}
        data = []
        for u in User.objects.all().order_by("id"):
            data.append({
                "id": u.id,
                "username": u.username,
                "email": getattr(u, "email", "") or "",
                "role": profiles.get(u.id, "viewer"),
                "is_active": u.is_active,
                "date_joined": getattr(u, "date_joined", None),
            })
        return Response(data, status=200)

    # POST
    payload = request.data or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    email = (payload.get("email") or "").strip()
    role = (payload.get("role") or "viewer").strip().lower()
    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()

    if not username or not password:
        return Response({"detail": "username and password are required"}, status=400)

    if role not in ("admin", "editor", "viewer"):
        return Response({"detail": "role must be one of: admin, editor, viewer"}, status=400)

    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return Response({"detail": "invalid email"}, status=400)

    try:
        with transaction.atomic():
            if User.objects.filter(username=username).exists():
                return Response({"detail": "username already exists"}, status=409)

            user = User(username=username, email=email or "")
            user.first_name = first_name
            user.last_name = last_name
            user.set_password(password)
            user.is_active = True
            user.save()

            # 确保有 profile 并设置角色
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": role})
            if not _:
                profile.role = role
                profile.save(update_fields=["role"])

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role,
            "is_active": user.is_active,
            "date_joined": getattr(user, "date_joined", None),
        }, status=201)
    except Exception as e:
        traceback.print_exc()
        return Response({"detail": f"create failed: {str(e)}"}, status=400)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id: int):
    """
    PATCH /api/admin/users/<id>/    -> 更新用户（role / is_active / password / email / name）
    DELETE /api/admin/users/<id>/   -> 删除用户（禁止自删；禁止删除超级用户）
    """
    if not _is_admin(request.user):
        return Response({"detail": "Permission denied."}, status=403)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    # 禁止删除 / 修改超级用户的超级属性（但可改 profile.role，不建议）
    if request.method == "DELETE":
        if user.id == request.user.id:
            return Response({"detail": "You cannot delete yourself."}, status=400)
        if getattr(user, "is_superuser", False):
            return Response({"detail": "Cannot delete superuser."}, status=400)
        user.delete()
        # 同步删除 profile（若存在）
        UserProfile.objects.filter(user_id=user_id).delete()
        return Response(status=204)

    # PATCH
    payload = request.data or {}
    changed = False

    # role
    if "role" in payload:
        role = (payload.get("role") or "").strip().lower()
        if role not in ("admin", "editor", "viewer"):
            return Response({"detail": "role must be one of: admin, editor, viewer"}, status=400)
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": role})
        if profile.role != role:
            profile.role = role
            profile.save(update_fields=["role"])
        changed = True

    # is_active
    if "is_active" in payload:
        is_active = bool(payload.get("is_active"))
        if user.is_active != is_active:
            # 防止把自己禁用，导致尴尬
            if user.id == request.user.id and not is_active:
                return Response({"detail": "You cannot deactivate yourself."}, status=400)
            user.is_active = is_active
            changed = True

    # email / first_name / last_name
    if "email" in payload:
        email = (payload.get("email") or "").strip()
        if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            return Response({"detail": "invalid email"}, status=400)
        user.email = email
        changed = True
    if "first_name" in payload:
        user.first_name = (payload.get("first_name") or "").strip()
        changed = True
    if "last_name" in payload:
        user.last_name = (payload.get("last_name") or "").strip()
        changed = True

    # password（可选重置）
    if "password" in payload:
        pwd = payload.get("password") or ""
        if len(pwd) < 6:
            return Response({"detail": "password too short (>=6)"}, status=400)
        user.set_password(pwd)
        changed = True

    if changed:
        user.save()

    # 输出当前信息（含 role）
    role_now = _role_of(user)
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": role_now,
        "is_active": user.is_active,
        "date_joined": getattr(user, "date_joined", None),
        "first_name": user.first_name,
        "last_name": user.last_name,
    }, status=200)


# ---------------- Assets ----------------
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().select_related("uploaded_by").prefetch_related("tags")
    serializer_class = AssetSerializer
    permission_classes = [AssetPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # 搜索字段
    search_fields = ["name", "description", "tags__name"]

    # 支持的过滤
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

    def _role(self, user):
        return getattr(getattr(user, "userprofile", None), "role", "viewer").lower()

    # ------- 标签过滤：支持 AND / OR -------
    def _parse_tag_filters(self, q):
        """
        返回 (ids, mode)
        - OR:  单个参数 CSV -> ?tags=1,2,3
        - AND: 重复参数    -> ?tags=1&tags=2
        """
        repeated = [t for t in q.getlist("tags") if t]
        if len(repeated) > 1:
            ids = []
            for item in repeated:
                for p in str(item).split(","):
                    p = p.strip()
                    if p.isdigit():
                        ids.append(int(p))
            ids = sorted(set(ids))
            return ids, "AND"

        if len(repeated) == 1:
            csv = repeated[0]
            ids = [int(x) for x in str(csv).split(",") if x.strip().isdigit()]
            ids = sorted(set(ids))
            if ids:
                return ids, "OR"

        return [], None

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

        # ★ 关键：支持 AND / OR
        tag_ids, mode = self._parse_tag_filters(q)
        if tag_ids:
            if mode == "AND":
                qs = (
                    qs.filter(tags__in=tag_ids)
                      .annotate(match_count=Count("tags", filter=Q(tags__in=tag_ids), distinct=True))
                      .filter(match_count=len(tag_ids))
                      .distinct()
                )
            else:
                qs = qs.filter(tags__in=tag_ids).distinct()

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
            base_name = (root or os.path.splitext(os.path.basename(asset.file.name))[0]) + (real_ext or "")

        mime, _ = mimetypes.guess_type(asset.file.name)
        mime = mime or "application/octet-stream"

        # 原子自增下载数
        Asset.objects.filter(pk=asset.pk).update(download_count=F("download_count") + 1)
        asset.refresh_from_db(fields=["download_count"])

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

    # ---------------- 版本历史（列表 / 新版上传） ----------------
    @action(detail=True, methods=["get", "post"], permission_classes=[IsAuthenticated], url_path="versions")
    def versions(self, request, pk=None):
        asset = self.get_object()

        if request.method.lower() == "get":
            qs = asset.versions.select_related("uploaded_by").all().order_by("-version", "-created_at")
            ser = AssetVersionSerializer(qs, many=True, context={"request": request})
            return Response(ser.data)

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

                asset.file = v.file
                asset.save(update_fields=["file"])

        except IntegrityError:
            return Response({"detail": "Version conflict. Please retry."}, status=409)
        except Exception as e:
            traceback.print_exc()
            return Response({"detail": f"Upload failed: {str(e)}"}, status=400)

        ser = AssetVersionSerializer(v, context={"request": request})
        return Response(ser.data, status=201)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="versions/latest")
    def latest_version(self, request, pk=None):
        asset = self.get_object()
        ver = asset.versions.select_related("uploaded_by").order_by("-version", "-created_at").first()
        if not ver:
            return Response({"detail": "No versions"}, status=404)
        ser = AssetVersionSerializer(ver, context={"request": request})
        return Response(ser.data)

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

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="restore_version")
    def restore_version_query(self, request, pk=None):
        if self._role(request.user) not in ("admin", "editor"):
            return Response({"detail": "Permission denied."}, status=403)
        ver = request.query_params.get("version")
        if not ver:
            return Response({"detail": "Missing version"}, status=400)
        return self.restore_version_nested(request, pk, ver)

    # ---------------- 预览计数（后端去抖） ----------------
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated], url_path="track_view")
    def track_view(self, request, pk=None):
        """
        进入 Preview 页时调用：
        - 使用 cache 做去抖：同一“用户或IP + 资产”在 TTL 内只 +1
        - 避免 PDF/Video 内部请求造成误增
        """
        asset = self.get_object()
        user = getattr(request, "user", None)
        uid = getattr(user, "id", None)
        ip = _client_ip(request)

        # ★ TTL：5分钟（可按需调整：60=1分钟，0=每次都加）
        ttl_seconds = 300
        cache_key = f"viewed:{asset.pk}:{uid or 'anon'}:{ip}"

        if cache.get(cache_key):
            return Response({"ok": True, "view_count": asset.view_count}, status=status.HTTP_200_OK)

        Asset.objects.filter(pk=asset.pk).update(view_count=F("view_count") + 1)
        cache.set(cache_key, 1, ttl_seconds)
        asset.refresh_from_db(fields=["view_count"])
        return Response({"ok": True, "view_count": asset.view_count}, status=status.HTTP_200_OK)


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticated]


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]



class AdminUserViewSet(viewsets.ModelViewSet):
    """
    /api/admin/users/  列表/创建
    /api/admin/users/<id>/  读/改/删
    仅 Admin 角色可访问
    """
    queryset = User.objects.all().order_by("id").select_related("userprofile")
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return AdminUserWriteSerializer
        return AdminUserReadSerializer
