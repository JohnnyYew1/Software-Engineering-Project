from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Asset, Tag, UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['user__username', 'user__email']

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'color']
    search_fields = ['name']

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['name', 'asset_no', 'asset_type', 'upload_date', 'uploaded_by']
    list_filter = ['asset_type', 'upload_date', 'tags']
    search_fields = ['name', 'asset_no', 'description']
    filter_horizontal = ['tags']