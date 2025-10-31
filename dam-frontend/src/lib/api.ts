const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
  getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    };
  },

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async upload(endpoint: string, formData: FormData) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('auth_token');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Token ${token}` }),
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },
};
