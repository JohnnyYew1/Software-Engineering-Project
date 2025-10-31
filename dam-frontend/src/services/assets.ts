import { api } from '@/lib/api';

export interface Asset {
  id: number;
  name: string;
  asset_no: string;
  brand: string;
  asset_type: string;
  file: string;
  upload_date: string;
  description: string;
  uploaded_by: number;
  tags: string[];
  view_count: number;
}

export interface AssetCreateData {
  name: string;
  asset_no: string;
  brand: string;
  asset_type: string;
  file: File;
  description: string;
  tags: number[];
}

export const assetService = {
  async getAssets(): Promise<Asset[]> {
    // ???? - ??????? API ??
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 1,
            name: 'Sample Image',
            asset_no: 'AST001',
            brand: 'Nikon',
            asset_type: 'image',
            file: '/assets/sample.jpg',
            upload_date: '2024-01-15T10:30:00Z',
            description: 'A sample image',
            uploaded_by: 1,
            tags: ['photo', 'sample'],
            view_count: 15
          },
          {
            id: 2,
            name: '3D Model',
            asset_no: 'AST002',
            brand: 'Blender',
            asset_type: '3d-model',
            file: '/assets/model.glb',
            upload_date: '2024-01-14T14:20:00Z',
            description: 'A 3D model asset',
            uploaded_by: 1,
            tags: ['3d', 'model'],
            view_count: 8
          }
        ]);
      }, 500);
    });
  },

  async getAsset(id: number): Promise<Asset> {
    return api.get(`/assets/${id}/`);
  },

  async createAsset(assetData: AssetCreateData): Promise<Asset> {
    const formData = new FormData();
    
    formData.append('file', assetData.file);
    formData.append('name', assetData.name);
    formData.append('asset_no', assetData.asset_no);
    formData.append('brand', assetData.brand);
    formData.append('asset_type', assetData.asset_type);
    formData.append('description', assetData.description);
    
    assetData.tags.forEach(tagId => {
      formData.append('tags', tagId.toString());
    });

    return api.upload('/assets/', formData);
  },

  async updateAsset(id: number, assetData: Partial<Asset>): Promise<Asset> {
    return api.put(`/assets/${id}/`, assetData);
  },

  async deleteAsset(id: number): Promise<void> {
    return api.delete(`/assets/${id}/`);
  },

  async searchAssets(query: string): Promise<Asset[]> {
    return api.get(`/assets/?search=${encodeURIComponent(query)}`);
  },
};
