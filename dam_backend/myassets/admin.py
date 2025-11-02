from django.contrib import admin
from django.contrib.auth.models import User
from .models import Asset, Tag, UserProfile

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "asset_type", "uploaded_by", "upload_date", "view_count", "download_count")
    list_filter = ("asset_type", "upload_date", "tags")
    search_fields = ("name", "description", "uploaded_by__username", "tags__name")
    date_hierarchy = "upload_date"
    autocomplete_fields = ("uploaded_by", "tags")
    readonly_fields = ("view_count", "download_count")

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fk_name = "user"
    extra = 0
    fields = ("role",)

class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "get_role")
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
