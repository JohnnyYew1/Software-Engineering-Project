# myassets/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class AssetPermission(BasePermission):
    """
    - SAFE methods: any authenticated user
    - POST (create/upload): Editor only
    - PUT/PATCH/DELETE:
        - Admin: allowed for any asset
        - Editor: only if uploaded_by == request.user
        - Viewer: never
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        if not request.user or not request.user.is_authenticated:
            return False

        # Upload
        if request.method == "POST":
            up = getattr(request.user, "userprofile", None)
            return getattr(up, "role", None) == "editor"

        # Edit/Delete
        role = getattr(getattr(request.user, "userprofile", None), "role", None)
        return role in ("admin", "editor")

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        role = getattr(getattr(request.user, "userprofile", None), "role", None)
        if role == "admin":
            return True
        if role == "editor":
            return getattr(obj, "uploaded_by_id", None) == request.user.id
        return False


class IsAdminRole(BasePermission):
    """
    放行以下任一条件：
    - user.is_superuser == True
    - user.is_staff == True
    - user.userprofile.role == 'admin'
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
