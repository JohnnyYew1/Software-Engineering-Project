import { authService } from '@/services/auth'

// 权限检查工具
export const hasPermission = (requiredRole: string | string[]): boolean => {
  const currentUser = authService.getCurrentUser()
  if (!currentUser) return false
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(currentUser.role)
  }
  
  return currentUser.role === requiredRole
}

// 具体权限检查
export const permissions = {
  // 用户管理权限：只有 admin 可以管理用户
  canManageUsers: (): boolean => hasPermission('admin'),
  
  // 上传权限：只有 editor 可以上传
  canUpload: (): boolean => hasPermission('editor'),
  
  // 编辑权限：admin 可以编辑所有，editor 只能编辑自己的
  canEditAsset: (assetOwnerId?: number): boolean => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return false
    
    if (currentUser.role === 'admin') return true
    if (currentUser.role === 'editor' && assetOwnerId === currentUser.id) return true
    
    return false
  },
  
  // 删除权限：admin 可以删除所有，editor 只能删除自己的
  canDeleteAsset: (assetOwnerId?: number): boolean => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) return false
    
    if (currentUser.role === 'admin') return true
    if (currentUser.role === 'editor' && assetOwnerId === currentUser.id) return true
    
    return false
  },
  
  // 下载权限：所有角色都可以下载
  canDownload: (): boolean => hasPermission(['admin', 'editor', 'viewer']),
  
  // 查看权限：所有角色都可以查看
  canView: (): boolean => hasPermission(['admin', 'editor', 'viewer']),
  
  // 获取当前用户
  getCurrentUser: () => authService.getCurrentUser(),
  
  // 获取当前用户角色
  getCurrentUserRole: (): string | null => {
    const user = authService.getCurrentUser()
    return user ? user.role : null
  }
}