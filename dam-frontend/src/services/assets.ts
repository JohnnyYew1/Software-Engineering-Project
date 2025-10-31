import { apiRequest } from '@/lib/api';

export interface Asset {
  id: number;
  name: string;
  asset_no: string;
  brand: string;
  asset_type: 'image' | '3d_model' | 'video';
  file: string;
  upload_date: string;
  description: string;
  uploaded_by: {
    username: string;
    first_name: string;
    last_name: string;
  };
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  view_count: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export const assetService = {
  // 获取所有资产
  async getAssets(search?: string, sort?: string, tags?: string): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);
    if (tags) params.append('tags', tags);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/assets/?${queryString}` : '/assets/';
    
    return await apiRequest(endpoint);
  },

  // 获取单个资产
  async getAsset(id: number): Promise<Asset> {
    return await apiRequest(`/assets/${id}/`);
  },

  // 创建资产（文件上传）
  async createAsset(formData: FormData): Promise<Asset> {
    const response = await fetch('http://127.0.0.1:8000/api/assets/', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to create asset');
    }

    return await response.json();
  },

  // 更新资产
  async updateAsset(id: number, data: Partial<Asset>): Promise<Asset> {
    return await apiRequest(`/assets/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 删除资产
  async deleteAsset(id: number): Promise<void> {
    await apiRequest(`/assets/${id}/`, {
      method: 'DELETE',
    });
  },

  // 获取所有标签
  async getTags(): Promise<Tag[]> {
    return await apiRequest('/tags/');
  },

  // 搜索资产
  async searchAssets(query: string): Promise<Asset[]> {
    return await apiRequest(`/assets/?search=${encodeURIComponent(query)}`);
  }
};