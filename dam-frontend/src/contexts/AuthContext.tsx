'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, User } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 确保使用 export 关键字
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // 使用 authService 中实际存在的方法
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // 清除认证数据的替代方法
        localStorage.removeItem('currentUser');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // 清除认证数据的替代方法
      localStorage.removeItem('currentUser');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login({ username, password });
      
      if (result.success && result.user) {
        setUser(result.user);
        return true;
      } else {
        setError(result.error || '登录失败');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('登录过程中发生错误');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// 确保使用 export 关键字
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}