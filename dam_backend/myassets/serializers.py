# serializers.py  —— 保留原有功能，增加 tag_ids 写入支持
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
    # 读：保持原有的嵌套 tags 列表
    tags = TagSerializer(many=True, read_only=True)
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    # 写：新增 tag_ids，可通过 multipart 多次传入 ?tag_ids=1&tag_ids=2 …
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False
    )

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
            "tags",        # read-only 展示
            "tag_ids",     # write-only 写入
            "upload_date",
            "download_count",
            "view_count",
            "uploaded_by",
        ]

    # --------- 读字段保留原有逻辑 ---------
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

    # --------- 写入标签的辅助 ---------
    def _extract_tag_ids(self, validated_data):
        """
        优先从 validated_data['tag_ids'] 取；若无（某些 parser 下 ListField 不生效），
        则从原始 request.data.getlist('tag_ids') 兜底。
        """
        ids = validated_data.pop("tag_ids", None)
        if ids is not None:
            return ids

        request = self.context.get("request")
        if request and hasattr(request, "data"):
            try:
                # 对于 multipart/form-data，会有 getlist
                return request.data.getlist("tag_ids")
            except Exception:
                raw = request.data.get("tag_ids")
                if raw is None:
                    return None
                # 兼容 "1,2,3" 的 CSV 形式
                if isinstance(raw, str):
                    return [x for x in raw.split(",") if x.strip()]
        return None

    # --------- 覆盖 create / update：同步 tags ---------
    def create(self, validated_data):
        tag_ids = self._extract_tag_ids(validated_data)

        # uploaded_by 由视图层 perform_create 传入，或者在这里兜底为 request.user
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data.setdefault("uploaded_by", request.user)

        instance = super().create(validated_data)

        if tag_ids is not None:
            # 过滤出合法 id 并一次性设置
            qs = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(qs)

        return instance

    def update(self, instance, validated_data):
        tag_ids = self._extract_tag_ids(validated_data)

        instance = super().update(instance, validated_data)

        if tag_ids is not None:
            qs = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(qs)

        return instance
