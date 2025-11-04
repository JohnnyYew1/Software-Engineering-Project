# myassets/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class AssetPermission(BasePermission):
    """
    - SAFE methods (GET/HEAD/OPTIONS): any authenticated user
    - POST (create/upload): Editor only
    - PUT/PATCH:
        - Editor: only if uploaded_by == request.user
        - Admin: NOT allowed (按需求禁用编辑)
        - Viewer: never
    - DELETE:
        - Admin: allowed for any asset
        - Editor: only if uploaded_by == request.user
        - Viewer: never
    """
    def has_permission(self, request, view):
        # SAFE：登录即可
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        # 非 SAFE 必须已登录
        if not request.user or not request.user.is_authenticated:
            return False

        role = getattr(getattr(request.user, "userprofile", None), "role", "viewer")

        if request.method == "POST":
            # 只有 Editor 可以上传
            return role == "editor"

        if request.method in ("PUT", "PATCH", "DELETE"):
            # Admin 可以走到对象级判断（此处先允许，具体限制在 has_object_permission）
            return role in ("admin", "editor")

        return False

    def has_object_permission(self, request, view, obj):
        # SAFE：对象级也放行
        if request.method in SAFE_METHODS:
            return True

        role = getattr(getattr(request.user, "userprofile", None), "role", "viewer")

        if role == "admin":
            # Admin 不允许编辑(put/patch)，但允许删除
            if request.method in ("PUT", "PATCH"):
                return False
            if request.method == "DELETE":
                return True
            return False

        if role == "editor":
            # 编辑/删除 仅限自己上传
            return getattr(obj, "uploaded_by_id", None) == request.user.id

        # viewer
        return False


class IsAdminRole(BasePermission):
    """
    管理端（用户管理等）放行条件：
    - is_superuser 或 is_staff
    - 或 userprofile.role == 'admin'
    """
    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        if not (u and u.is_authenticated):
            return False
        if getattr(u, "is_superuser", False) or getattr(u, "is_staff", False):
            return True
        up = getattr(u, "userprofile", None)
        role = getattr(up, "role", "viewer")
        return str(role).lower() == "admin"
