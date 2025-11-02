from rest_framework.permissions import BasePermission, SAFE_METHODS

class AssetPermission(BasePermission):
    """
    - SAFE methods: any authenticated user
    - POST (create/upload): Editor only (Admin & Viewer forbidden)
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
            return hasattr(request.user, "userprofile") and request.user.userprofile.role == "editor"
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
