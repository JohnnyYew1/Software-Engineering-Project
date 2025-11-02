from rest_framework import serializers
from .models import Asset, Tag, UserProfile

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]

class AssetSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()  # ✅ 前端可直接用绝对 URL

    class Meta:
        model = Asset
        fields = [
            "id", "name", "description", "asset_type",
            "file", "file_url",
            "upload_date", "view_count", "download_count",
            "uploaded_by", "tags",
        ]
        read_only_fields = ["uploaded_by", "view_count", "download_count"]

    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            return {"id": obj.uploaded_by.id, "username": obj.uploaded_by.username}
        return None

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            url = obj.file.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["id", "user", "role"]

    def get_user(self, obj):
        return {"id": obj.user.id, "username": obj.user.username}
