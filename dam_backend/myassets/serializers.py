from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Asset, Tag, UserProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'role']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']

class AssetSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    
    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_no', 'brand', 'asset_type', 
            'file', 'upload_date', 'description', 'uploaded_by', 
            'tags', 'view_count', 'download_count'  # 添加 download_count
        ]
        read_only_fields = ['upload_date', 'view_count', 'download_count']

# 添加缺失的序列化器
class SimpleAssetSerializer(serializers.ModelSerializer):
    """简单的资产序列化器，用于调试"""
    class Meta:
        model = Asset
        fields = ['id', 'name', 'asset_no', 'brand', 'asset_type', 'file']

class SafeAssetSerializer(serializers.ModelSerializer):
    """安全的资产序列化器，处理可能的空值"""
    uploaded_by = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    
    def get_uploaded_by(self, obj):
        if obj.uploaded_by:
            return {
                'id': obj.uploaded_by.id,
                'username': obj.uploaded_by.username
            }
        return None
    
    def get_tags(self, obj):
        return list(obj.tags.values('id', 'name', 'color'))
    
    class Meta:
        model = Asset
        fields = '__all__'  # 使用 __all__ 确保包含所有字段