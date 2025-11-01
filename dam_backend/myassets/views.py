from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.http import HttpResponse
from .models import Asset, Tag, UserProfile
from .serializers import AssetSerializer, TagSerializer, UserProfileSerializer
from django.http import FileResponse
import os

# ViewSets for API

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer  # 保持原样，但我们添加调试端点

@action(detail=False, methods=['get'])
def debug_list(self, request):
    """调试端点：返回简单的资产信息"""
    assets = Asset.objects.all()
    
    # 使用简单的字典而不是序列化器
    assets_data = []
    for asset in assets:
        assets_data.append({
            'id': asset.id,
            'name': asset.name,
            'asset_no': asset.asset_no,
            'asset_type': asset.asset_type,
            'file_url': asset.file.url if asset.file else None,
        })
    
    return Response({
        'count': assets.count(),
        'assets': assets_data
    })
    def get_queryset(self):
        # 根据用户角色返回相应的资产
        user = self.request.user
        if not user.is_authenticated:
            return Asset.objects.none()
        
        try:
            user_profile = user.userprofile
            if user_profile.role == 'admin':
                return Asset.objects.all()
            else:
                # editor 和 viewer 可以看到所有资产，但编辑权限不同
                return Asset.objects.all()
        except UserProfile.DoesNotExist:
            return Asset.objects.none()

@action(detail=True, methods=['get'])
@permission_classes([permissions.IsAuthenticated])
def preview(self, request, pk=None):
    """图片预览端点"""
    asset = get_object_or_404(Asset, pk=pk)
    
    if asset.asset_type != 'image':
        return Response({'error': 'Preview only available for images'}, status=400)
    
    # 确保文件存在
    if not asset.file:
        return Response({'error': 'File not found'}, status=404)
    
    try:
        # 获取文件路径
        file_path = asset.file.path
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return Response({'error': 'File does not exist on server'}, status=404)
        
        # 打开文件
        file = open(file_path, 'rb')
        
        # 创建响应（inline 显示而不是下载）
        response = FileResponse(file, content_type='image/jpeg')
        response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
        
        # 增加查看次数
        asset.view_count += 1
        asset.save()
        
        return response
        
    except Exception as e:
        print(f"Preview error: {str(e)}")
        return Response({'error': f'Preview failed: {str(e)}'}, status=500)
class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.AllowAny]

# Authentication views
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def user_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    # 检查用户名和密码是否提供
    if not username or not password:
        return Response({
            'success': False,
            'error': 'Username and password are required.'
        }, status=400)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        try:
            user_profile = user.userprofile
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user_profile.role,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            })
        except UserProfile.DoesNotExist:
            # 如果用户没有 UserProfile，创建一个默认的
            user_profile = UserProfile.objects.create(user=user, role='viewer')
            return Response({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user_profile.role,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            })
    else:
        # 检查用户是否存在
        try:
            user_exists = User.objects.filter(username=username).exists()
            if user_exists:
                return Response({
                    'success': False,
                    'error': 'Invalid password. Please check your password.'
                }, status=400)
            else:
                return Response({
                    'success': False,
                    'error': 'Username does not exist. Please check your username.'
                }, status=400)
        except Exception:
            # 如果检查用户存在性时出错，返回通用错误
            return Response({
                'success': False,
                'error': 'Invalid username or password.'
            }, status=400)

@api_view(['POST'])
def user_logout(request):
    logout(request)
    return Response({'success': True})

@api_view(['GET'])
def get_current_user(request):
    if request.user.is_authenticated:
        user_profile = request.user.userprofile
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'role': user_profile.role,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name
        })
    return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

# 在 myassets/views.py 中添加调试端点
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def debug_routes(request):
    """调试端点，显示所有可用的API路由"""
    from django.urls import get_resolver
    from collections import OrderedDict
    
    resolver = get_resolver()
    patterns = resolver.url_patterns
    
    routes = OrderedDict()
    
    for pattern in patterns:
        if hasattr(pattern, 'url_patterns'):
            # 这是include的路由
            for p in pattern.url_patterns:
                if hasattr(p, 'name') and p.name:
                    routes[p.name] = str(pattern.pattern) + str(p.pattern)
        else:
            # 直接路由
            if hasattr(pattern, 'name') and pattern.name:
                routes[pattern.name] = str(pattern.pattern)
    
    return Response({
        'available_routes': routes,
        'assets_endpoints': [
            '/api/assets/',
            '/api/assets/{id}/',
            '/api/assets/{id}/download/',
            '/api/assets/{id}/increment-view/'
        ]
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_assets_basic(request):
    """最基本的资产测试端点"""
    assets = Asset.objects.all()
    
    # 直接构建响应数据，避免序列化器问题
    data = {
        'total_assets': assets.count(),
        'assets': []
    }
    
    for asset in assets:
        data['assets'].append({
            'id': asset.id,
            'name': asset.name,
            'asset_no': asset.asset_no,
            'type': asset.asset_type,
            'has_file': bool(asset.file),
            'file_path': str(asset.file) if asset.file else None,
        })
    
    return Response(data)