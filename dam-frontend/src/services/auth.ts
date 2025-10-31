export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

// 安全的 localStorage 访问函数
const getLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null; // 服务器端返回 null
  }
  return localStorage.getItem(key);
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return; // 服务器端不执行
  }
  localStorage.setItem(key, value);
};

const removeLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') {
    return; // 服务器端不执行
  }
  localStorage.removeItem(key);
};

export const authService = {
  async login(credentials: LoginData): Promise<{ user: User; token: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (credentials.username && credentials.password) {
          const user: User = {
            id: 1,
            username: credentials.username,
            email: `${credentials.username}@example.com`,
            role: 'editor'
          };
          const token = 'mock-jwt-token';
          
          setLocalStorage('auth_token', token);
          setLocalStorage('user', JSON.stringify(user));
          
          resolve({ user, token });
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  },

  logout(): void {
    removeLocalStorage('auth_token');
    removeLocalStorage('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  getCurrentUser(): User | null {
    const userStr = getLocalStorage('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!getLocalStorage('auth_token');
  },

  getToken(): string | null {
    return getLocalStorage('auth_token');
  },
};