from django.shortcuts import render
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Asset, Tag, UserProfile
from .serializers import AssetSerializer, TagSerializer, UserProfileSerializer

# ViewSets for API
class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.AllowAny]

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