from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Asset, Tag, AssetVersion, UserProfile

User = get_user_model()


# ---- 基础序列化 ----
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ["id", "user", "role"]


# ---- 版本历史 ----
class AssetVersionListSerializer(serializers.ModelSerializer):
    uploaded_by = UserMiniSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = AssetVersion
        fields = [
            "id",
            "version",
            "file",
            "file_url",
            "uploaded_at",
            "uploaded_by",
            "note",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        try:
            if obj.file and hasattr(obj.file, "url"):
                return obj.file.url
        except Exception:
            pass
        return None


class AssetVersionCreateSerializer(serializers.ModelSerializer):
    """POST /assets/{id}/versions/ 用：只需文件与可选备注"""
    class Meta:
        model = AssetVersion
        fields = ["file", "note"]

    def validate_file(self, f):
        if not f:
            raise serializers.ValidationError("文件不能为空")
        return f


# ---- 资产 ----
class AssetSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Tag.objects.all(), write_only=True, required=False, source="tags"
    )
    file_url = serializers.SerializerMethodField()
    uploaded_by = UserMiniSerializer(read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id",
            "name",
            "brand",
            "asset_no",
            "description",
            "asset_type",      # 注意：你的模型字段是 asset_type
            "file",
            "file_url",
            "tags",
            "tag_ids",
            "upload_date",     # 注意：你的模型字段是 upload_date
            "download_count",
            "view_count",
            "uploaded_by",
        ]
        read_only_fields = [
            "id",
            "file_url",
            "upload_date",
            "download_count",
            "view_count",
            "uploaded_by",
        ]

    def get_file_url(self, obj):
        try:
            if obj.file and hasattr(obj.file, "url"):
                return obj.file.url
        except Exception:
            pass
        return None

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        asset = Asset.objects.create(**validated_data)
        if tags:
            asset.tags.set(tags)
        return asset

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance
