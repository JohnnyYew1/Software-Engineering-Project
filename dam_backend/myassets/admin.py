# myassets/admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from .models import Asset, Tag, UserProfile, AssetVersion

# ---------- Tag ----------
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

# ---------- Asset ----------
@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "asset_type",
        "uploaded_by",
        "upload_date",
        "view_count",
        "download_count",
    )
    list_filter = ("asset_type", "upload_date", "tags")
    search_fields = ("name", "description", "uploaded_by__username", "tags__name")
    date_hierarchy = "upload_date"
    autocomplete_fields = ("uploaded_by", "tags")

# ---------- AssetVersion（只用现有字段，暂不显示 note） ----------
@admin.register(AssetVersion)
class AssetVersionAdmin(admin.ModelAdmin):
    list_display = ("id", "asset", "version", "created_at", "uploaded_by", "file")
    list_select_related = ("asset", "uploaded_by")
    date_hierarchy = "created_at"
    search_fields = ("asset__name", "uploaded_by__username")
    list_filter = ("created_at",)
    autocomplete_fields = ("asset", "uploaded_by")
    ordering = ("-version", "-created_at")

# ---------- User & Profile ----------
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    extra = 0
    can_delete = False
    fk_name = "user"

class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "is_active", "is_staff", "get_role")
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    inlines = [UserProfileInline]

    def get_role(self, obj):
        try:
            return obj.userprofile.role
        except UserProfile.DoesNotExist:
            return "-"
    get_role.short_description = "Role"

# 重新注册 User，使 inline 生效
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
