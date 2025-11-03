from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Asset, Tag, UserProfile, AssetVersion


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["id", "username", "email", "role"]


class MiniUserSerializer(serializers.Serializer):
    """精简用户信息（用于 uploaded_by 字段）"""
    id = serializers.IntegerField()
    username = serializers.CharField()


class AssetVersionSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()

    class Meta:
        model = AssetVersion
        fields = [
            "id",
            "version",
            "file",
            "file_url",
            "created_at",
            "uploaded_by",
            "note",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_uploaded_by(self, obj):
        u = getattr(obj, "uploaded_by", None)
        if not u:
            return None
        return {"id": u.id, "username": u.username}


class AssetSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "id",
            "name",
            "brand",
            "asset_no",
            "description",
            "asset_type",
            "file",
            "file_url",
            "tags",
            "upload_date",
            "download_count",
            "view_count",
            "uploaded_by",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            url = obj.file.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_uploaded_by(self, obj):
        u = getattr(obj, "uploaded_by", None)
        if not u:
            return None
        return {"id": u.id, "username": u.username}
