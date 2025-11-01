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
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#3498db")

    def __str__(self):
        return self.name

class Asset(models.Model):
    ASSET_TYPES = [
        ('image', 'Image'),
        ('3d_model', '3D Model'), 
        ('video', 'Video'),
    ]
    
    name = models.CharField(max_length=200)
    asset_no = models.CharField(max_length=50, unique=True)
    brand = models.CharField(max_length=100, blank=True)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPES)
    file = models.FileField(upload_to='assets/%Y/%m/%d/')
    upload_date = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag, blank=True)
    view_count = models.IntegerField(default=0)
    download_count = models.IntegerField(default=0)  # 添加下载计数字段

    def __str__(self):
        return f"{self.name} ({self.asset_type})"

    class Meta:
        verbose_name = "Asset"
        verbose_name_plural = "Assets"
        ordering = ['-upload_date']