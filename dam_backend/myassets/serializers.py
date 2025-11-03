from rest_framework import serializers
from .models import Asset, Tag, UserProfile

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        # 补充 color（前端 Tag 类型里有可选 color 字段）
        fields = ["id", "name", "color"]

class AssetSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    # ✅ 把 tags 序列化成对象数组 [{id,name,color}]
    tags = TagSerializer(many=True, read_only=True)
    # ✅ 新增写入用字段：创建/更新时用 tag_ids 传主键列表
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = Asset
        fields = [
            "id", "name", "description", "asset_type",
            "file", "file_url",
            "upload_date", "view_count", "download_count",
            "uploaded_by",
            "tags",          # 读：对象数组
            "tag_ids",       # 写：主键数组
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

    def create(self, validated_data):
        tag_ids = validated_data.pop("tag_ids", [])
        asset = super().create(validated_data)
        if tag_ids:
            asset.tags.set(tag_ids)
        return asset

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop("tag_ids", None)
        asset = super().update(instance, validated_data)
        if tag_ids is not None:
            asset.tags.set(tag_ids)
        return asset


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ["id", "user", "role"]

    def get_user(self, obj):
        return {"id": obj.user.id, "username": obj.user.username}
