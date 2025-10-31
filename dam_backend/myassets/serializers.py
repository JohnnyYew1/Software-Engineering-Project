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
            'tags', 'view_count'
        ]