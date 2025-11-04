# serializers.py —— 保留原有功能，增加 tag_ids 写入支持与前端兼容字段
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Asset, Tag, UserProfile, AssetVersion

# -------- Tags --------
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


# -------- UserProfile（只读）--------
class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["id", "username", "email", "role"]


# -------- Mini User（用于嵌入字段 uploaded_by）--------
class MiniUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


# -------- Asset Version --------
class AssetVersionSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()
    # 兼容旧前端：把 created_at 映射一份到 uploaded_at
    uploaded_at = serializers.SerializerMethodField()

    class Meta:
        model = AssetVersion
        fields = [
            "id",
            "version",
            "file",
            "file_url",
            "created_at",
            "uploaded_at",   # 兼容字段
            "uploaded_by",
            "note",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        file_field = getattr(obj, "file", None)
        if file_field is not None and hasattr(file_field, "url"):
            url = file_field.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_uploaded_by(self, obj):
        u = getattr(obj, "uploaded_by", None)
        if not u:
            return None
        return {"id": u.id, "username": u.username}

    def get_uploaded_at(self, obj):
        # 旧代码有时使用 uploaded_at，这里返回 created_at
        return getattr(obj, "created_at", None)


# -------- Asset --------
class AssetSerializer(serializers.ModelSerializer):
    # 读：保持原有的嵌套 tags 列表
    tags = TagSerializer(many=True, read_only=True)
    uploaded_by = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    # 写：新增 tag_ids，可通过 multipart 多次传入 ?tag_ids=1&tag_ids=2 … 或 JSON 数组 / CSV 字符串
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
        file_field = getattr(obj, "file", None)
        if file_field is not None and hasattr(file_field, "url"):
            url = file_field.url
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
        则从原始 request.data.getlist('tag_ids') 兜底；再兼容 CSV "1,2,3"。
        最终返回：list[int] 或 None
        """
        ids = validated_data.pop("tag_ids", None)
        if ids is not None:
            # ListField 已经校验为 int 列表
            return [int(x) for x in ids if str(x).isdigit()]

        request = self.context.get("request")
        if request and hasattr(request, "data"):
            try:
                # multipart/form-data 可 getlist
                raw_list = request.data.getlist("tag_ids")
                if raw_list:
                    flat = []
                    for item in raw_list:
                        for p in str(item).split(","):
                            p = p.strip()
                            if p.isdigit():
                                flat.append(int(p))
                    return sorted(set(flat))
            except Exception:
                raw = request.data.get("tag_ids")
                if raw is None:
                    return None
                if isinstance(raw, str):
                    parts = [p.strip() for p in raw.split(",") if p.strip().isdigit()]
                    return sorted(set([int(x) for x in parts]))
                if isinstance(raw, (list, tuple)):
                    return sorted(set([int(x) for x in raw if str(x).isdigit()]))
        return None

    # --------- 覆盖 create / update：同步 tags ---------
    def create(self, validated_data):
        tag_ids = self._extract_tag_ids(validated_data)

        # uploaded_by 由视图层 perform_create 传入，或在这里兜底为 request.user
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            validated_data.setdefault("uploaded_by", request.user)

        instance = super().create(validated_data)

        if tag_ids is not None:
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


# ===================== Admin 用户管理（新增） =====================

class AdminUserReadSerializer(serializers.ModelSerializer):
    """
    管理端读取：附带 role（来自 UserProfile.role；默认 viewer）
    """
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "date_joined",
            "first_name",
            "last_name",
            "role",
        ]

    def get_role(self, obj):
        up = getattr(obj, "userprofile", None)
        return getattr(up, "role", "viewer")


class AdminUserWriteSerializer(serializers.ModelSerializer):
    """
    管理端写入：支持 username、email、password、first_name、last_name、is_active、role
    - password 写入时会正确 set_password
    - role 会同步到 UserProfile（没有则创建）
    """
    role = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "is_active",
            "role",
        ]

    def create(self, validated_data):
        role = (validated_data.pop("role", None) or "viewer").strip().lower()
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        user.set_password(password or User.objects.make_random_password())
        user.save()

        # 同步/创建 UserProfile.role
        up, created = UserProfile.objects.get_or_create(user=user, defaults={"role": role})
        if not created:
            up.role = role
            up.save()
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()

        if role:
            r = str(role).strip().lower()
            up, created = UserProfile.objects.get_or_create(user=instance, defaults={"role": r})
            if not created:
                up.role = r
                up.save()
        return instance
