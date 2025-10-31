import { apiRequest } from '@/lib/api';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'editor' | 'viewer';
  first_name: string;
  last_name: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        // 根据 HTTP 状态码提供更具体的错误信息
        if (response.status === 400) {
          return { 
            success: false, 
            error: 'Invalid username or password. Please check your credentials.' 
          };
        } else if (response.status === 500) {
          return { 
            success: false, 
            error: 'Server error. Please try again later.' 
          };
        } else {
          return { 
            success: false, 
            error: `Connection error (${response.status}). Please check your network.` 
          };
        }
      }

      const data = await response.json();
      
      if (data.success) {
        // 保存用户信息到 localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { 
          success: false, 
          error: data.error || 'Login failed. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Cannot connect to the server. Please make sure the backend is running.' 
      };
    }
  },

  
  // 登出
 async logout(): Promise<void> {
    try {
      // 调用后端注销API
      await fetch('http://127.0.0.1:8000/api/logout/', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // 无论如何都要清除前端状态
      localStorage.removeItem('currentUser');
      // 强制刷新页面以确保所有状态被清除
      window.location.href = '/login';
    }
  },

  // 获取当前用户
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // 检查是否已认证
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  // 获取当前用户角色
  getCurrentUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }
};