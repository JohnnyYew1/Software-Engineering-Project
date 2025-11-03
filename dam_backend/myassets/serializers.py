# myassets/serializers.py
from rest_framework import serializers
from .models import Asset, Tag, UserProfile

# --- Tags ---
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color"]

# --- UploadedBy（精简版）---
class UploadedBySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()

# --- Asset ---
class AssetSerializer(serializers.ModelSerializer):
    # 读：返回完整 Tag 对象
    tags = TagSerializer(many=True, read_only=True)
    # 写：接收 tag 的 id 列表
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
    )
    # 衍生字段：文件绝对 URL，便于前端直接使用
    file_url = serializers.SerializerMethodField(read_only=True)
    # uploaded_by 精简（只回 id/username）
    uploaded_by = serializers.SerializerMethodField(read_only=True)

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        try:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        except Exception:
            return None

    def get_uploaded_by(self, obj):
        user = getattr(obj, "uploaded_by", None)
        if not user:
            return None
        return {"id": user.id, "username": user.username}

    def create(self, validated_data):
        tag_ids = validated_data.pop("tag_ids", [])
        asset = Asset.objects.create(**validated_data)
        if tag_ids:
            qs = Tag.objects.filter(id__in=tag_ids)
            asset.tags.set(qs)
        return asset

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop("tag_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if tag_ids is not None:
            qs = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(qs)
        return instance

    class Meta:
        model = Asset
        fields = [
            "id",
            "name",
            "asset_type",
            "file",
            "file_url",
            "description",
            "upload_date",
            "uploaded_by",
            "tags",
            "tag_ids",
            # 如果你模型里有这些字段就会自动序列化；没有则忽略
            "brand",
            "asset_no",
            "view_count",
            "download_count",
        ]
        read_only_fields = ["upload_date", "uploaded_by", "view_count", "download_count"]

# --- UserProfile ---
class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "user",       # 主键（如你不想暴露可去掉）
            "username",
            "email",
            "role",
            "is_active",
        ]
        read_only_fields = ["user", "username", "email", "is_active"]
