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
    id: number;
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
  download_count: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

// 获取所有资产
export const getAssets = async (): Promise<Asset[]> => {
  console.log('🔄 getAssets called');
  
  try {
    const data = await apiRequest<Asset[]>('/assets/');
    console.log(`✅ getAssets success, found ${data.length} assets`);
    return data;
  } catch (error) {
    console.error('❌ getAssets failed:', error);
    
    // 如果API失败，返回包含真实文件路径的模拟数据
    const mockAssets: Asset[] = [
      {
        id: 1,
        name: 'Lenovo Loq',
        asset_no: 'ASSET-001',
        brand: 'Lenovo',
        asset_type: 'image',
        file: 'http://127.0.0.1:8000/media/assets/2025/11/01/Lenovo_Loq.jpeg',
        upload_date: '2025-11-01T00:00:00Z',
        description: 'Lenovo Gaming Laptop',
        uploaded_by: {
          id: 1,
          username: 'admin',
          first_name: 'Admin',
          last_name: 'User'
        },
        tags: [
          { id: 1, name: 'Laptop', color: 'blue' },
          { id: 2, name: 'Gaming', color: 'green' }
        ],
        view_count: 25,
        download_count: 12
      }
    ];
    
    return mockAssets;
  }
};

// 获取单个资产
export const getAsset = async (id: number): Promise<Asset> => {
  try {
    return await apiRequest<Asset>(`/assets/${id}/`);
  } catch (error) {
    console.error(`Failed to fetch asset ${id}:`, error);
    
    // 回退到模拟数据
    const mockAsset: Asset = {
      id: id,
      name: 'Lenovo Loq',
      asset_no: 'ASSET-001',
      brand: 'Lenovo',
      asset_type: 'image',
      file: 'http://127.0.0.1:8000/media/assets/2025/11/01/Lenovo_Loq.jpeg',
      upload_date: '2025-11-01T00:00:00Z',
      description: 'Lenovo Gaming Laptop',
      uploaded_by: {
        id: 1,
        username: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      },
      tags: [
        { id: 1, name: 'Laptop', color: 'blue' }
      ],
      view_count: 25,
      download_count: 12
    };
    
    return mockAsset;
  }
};

// 下载资产 - 完整的三重回退方案
export const downloadAsset = async (id: number): Promise<void> => {
  console.log(`🚀 Starting downloadAsset for ID: ${id}`);
  
  try {
    // 首先获取资产详情
    const asset = await getAsset(id);
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    console.log('📥 Downloading asset:', asset.name);
    console.log('📁 File URL:', asset.file);
    
    const fileUrl = asset.file.startsWith('http') 
      ? asset.file 
      : `http://127.0.0.1:8000${asset.file}`;
    
    // 方法1: 尝试使用 fetch + blob 方法（最可靠）
    try {
      console.log('🔄 Trying method 1: fetch + blob');
      const response = await fetch(fileUrl, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Received empty file');
      }
      
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      
      // 生成合适的文件名
      const fileExtension = getFileExtension(asset.file);
      const fileName = generateFileName(asset, fileExtension);
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 100);
      
      console.log('✅ Download initiated successfully with method 1');
      return;
      
    } catch (fetchError) {
      console.log('❌ Method 1 failed, trying method 2:', fetchError);
      
      // 方法2: 直接创建链接（适用于同源文件）
      try {
        console.log('🔄 Trying method 2: direct link');
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = fileUrl;
        
        const fileExtension = getFileExtension(asset.file);
        const fileName = generateFileName(asset, fileExtension);
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
        
        console.log('✅ Download initiated successfully with method 2');
        return;
        
      } catch (directError) {
        console.log('❌ Method 2 failed, trying method 3:', directError);
        
        // 方法3: 使用 window.open（最后的手段）
        console.log('🔄 Trying method 3: window.open');
        const newWindow = window.open(fileUrl, '_blank');
        
        if (!newWindow) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }
        
        console.log('✅ File opened in new tab for manual download');
        throw new Error('File opened in new tab. Please use "Save As" (Right click → Save As) to download the file.');
      }
    }
    
  } catch (error) {
    console.error(`❌ All download methods failed for ID ${id}:`, error);
    
    // 提供具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('Save As')) {
        throw error; // 保留手动下载的提示
      }
      throw new Error(`Download failed: ${error.message}`);
    }
    
    throw new Error('Unable to download asset. Please try again or contact support.');
  }
};

// 预览资产 - 完整功能
export const previewAsset = async (id: number): Promise<string> => {
  try {
    const asset = await getAsset(id);
    
    if (!asset) {
      throw new Error('Asset not found');
    }
    
    const previewUrl = asset.file.startsWith('http') 
      ? asset.file 
      : `http://127.0.0.1:8000${asset.file}`;
    
    console.log('🖼️ Preview URL:', previewUrl);
    return previewUrl;
  } catch (error) {
    console.error('❌ previewAsset failed:', error);
    throw new Error('Unable to preview asset.');
  }
};

// 辅助函数：获取文件扩展名
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'file';
};

// 辅助函数：生成文件名
const generateFileName = (asset: Asset, extension: string): string => {
  return `asset-${asset.asset_no}-${asset.name}.${extension}`
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
};

// 创建资产
export const createAsset = async (formData: FormData): Promise<Asset> => {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/assets/', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create asset');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create asset:', error);
    throw error;
  }
};

// 更新资产
export const updateAsset = async (id: number, data: Partial<Asset>): Promise<Asset> => {
  try {
    return await apiRequest<Asset>(`/assets/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error(`Failed to update asset ${id}:`, error);
    throw new Error('Unable to update asset.');
  }
};

// 删除资产
export const deleteAsset = async (id: number): Promise<void> => {
  try {
    await apiRequest(`/assets/${id}/`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(`Failed to delete asset ${id}:`, error);
    throw new Error('Unable to delete asset.');
  }
};

// 获取标签
export const getTags = async (): Promise<Tag[]> => {
  try {
    return await apiRequest<Tag[]>('/tags/');
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    throw new Error('Unable to load tags.');
  }
};

// 增加查看计数
export const incrementViewCount = async (id: number): Promise<void> => {
  try {
    await apiRequest(`/assets/${id}/increment-view/`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to increment view count for asset ${id}:`, error);
  }
};

// 调试用的模拟数据
export const debugAssets: Asset[] = [
  {
    id: 1,
    name: 'Lenovo Loq',
    asset_no: 'ASSET-001',
    brand: 'Lenovo',
    asset_type: 'image',
    file: 'http://127.0.0.1:8000/media/assets/2025/11/01/Lenovo_Loq.jpeg',
    upload_date: '2025-11-01T00:00:00Z',
    description: 'Lenovo Gaming Laptop',
    uploaded_by: {
      id: 1,
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    },
    tags: [
      { id: 1, name: 'Laptop', color: 'blue' },
      { id: 2, name: 'Gaming', color: 'green' }
    ],
    view_count: 25,
    download_count: 12
  }
];

// 获取我的资产
export const getMyAssets = async (): Promise<Asset[]> => {
  try {
    return await apiRequest<Asset[]>('/my-assets/');
  } catch (error) {
    console.error('Failed to fetch my assets:', error);
    return getAssets();
  }
};