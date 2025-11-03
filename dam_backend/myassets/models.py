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
        ('video', 'Video'),
        ('pdf',   'PDF'),
        ('3d_model', '3D Model'),
        ('document', 'Document'),
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
    download_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.name} ({self.asset_type})"


# 版本文件存储路径：assets/{asset_id}/v{version}/{filename}
def version_upload_path(instance, filename):
    return f"assets/{instance.asset_id}/v{instance.version}/{filename}"

class AssetVersion(models.Model):
    asset = models.ForeignKey(Asset, related_name='versions', on_delete=models.CASCADE)
    version = models.PositiveIntegerField(default=1)
    file = models.FileField(upload_to=version_upload_path)
    note = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("asset", "version")
        ordering = ['-version', '-created_at']

    def __str__(self):
        return f"{self.asset_id} v{self.version}"
