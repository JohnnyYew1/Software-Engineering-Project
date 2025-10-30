from django.db import models

# Create your models here.
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    USER_ROLES = [
        ('admin', 'Admin'),
        ('editor', 'Editor'), 
        ('viewer', 'Viewer'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=USER_ROLES, default='viewer')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name="Tag Name")
    color = models.CharField(max_length=7, default="#3498db", verbose_name="Tag Color")
    
    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"

class Asset(models.Model):
    ASSET_TYPES = [
        ('image', 'Image'),
        ('document', 'Document'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('other', 'Other'),
    ]
    
    # 基础信息
    name = models.CharField(max_length=200, verbose_name="Asset Name")
    asset_no = models.CharField(max_length=50, unique=True, verbose_name="Asset Number")
    brand = models.CharField(max_length=100, blank=True, verbose_name="Brand")
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPES, verbose_name="Asset Type")
    
    # 文件信息
    file = models.FileField(upload_to='assets/%Y/%m/%d/', verbose_name="File")
    upload_date = models.DateTimeField(auto_now_add=True, verbose_name="Upload Date")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # 用户关联
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Uploaded By")
    
    # 标签系统
    tags = models.ManyToManyField(Tag, blank=True, verbose_name="Tags")
    
    # 统计信息
    view_count = models.IntegerField(default=0, verbose_name="View Count")
    
    def __str__(self):
        return f"{self.asset_no} - {self.name}"

    class Meta:
        verbose_name = "Asset"
        verbose_name_plural = "Assets"
        ordering = ['-upload_date']