'use client'
import { 
  Box, 
  VStack, 
  Heading, 
  Button, 
  HStack,
  Badge,
  Text,
  Input
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'  // 添加这行导入
import { permissions } from '@/utils/permissions'

// 模拟资产数据 - 稍后替换为真实API
const mockAssets = [
  {
    id: 1,
    name: 'Product Image 1',
    asset_no: 'ASSET-001',
    brand: 'Nike',
    asset_type: 'image',
    upload_date: '2024-01-15',
    uploaded_by: { id: 2, username: 'editor1' }, // 添加用户ID
    view_count: 45
  },
  {
    id: 2, 
    name: '3D Shoe Model',
    asset_no: 'ASSET-002',
    brand: 'Adidas',
    asset_type: '3d_model',
    upload_date: '2024-01-14',
    uploaded_by: { id: 1, username: 'admin' }, // 添加用户ID
    view_count: 23
  },
  {
    id: 3,
    name: 'Promo Video',
    asset_no: 'ASSET-003', 
    brand: 'Puma',
    asset_type: 'video',
    upload_date: '2024-01-13',
    uploaded_by: { id: 3, username: 'editor2' }, // 添加用户ID
    view_count: 67
  }
]

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>(mockAssets)
  const [searchQuery, setSearchQuery] = useState('')
  const currentUser = permissions.getCurrentUser()
  const router = useRouter()  // 添加这行初始化

  // 稍后替换为从API获取真实数据
  useEffect(() => {
    // assetService.getAssets().then(setAssets)
  }, [])

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'blue'
      case '3d_model': return 'green' 
      case 'video': return 'purple'
      default: return 'gray'
    }
  }

  // 检查当前用户是否是资产的所有者
  const isAssetOwner = (asset: any) => {
    return currentUser && asset.uploaded_by.id === currentUser.id
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading>Asset Management</Heading>
      
      {/* 搜索栏 */}
      <Box>
        <Input
          placeholder="Search assets by name, brand, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      {/* 资产表格 */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        {/* 表头 */}
        <Box 
          display="grid" 
          gridTemplateColumns="1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" 
          bg="gray.50" 
          p={4}
          fontWeight="bold"
          borderBottom="1px solid"
          borderColor="gray.200"
        >
          <Box>Asset Name</Box>
          <Box>Asset No.</Box>
          <Box>Brand</Box>
          <Box>Type</Box>
          <Box>Upload Date</Box>
          <Box>Uploaded By</Box>
          <Box>Views</Box>
          <Box>Actions</Box>
        </Box>
        
        {/* 表格内容 */}
        {assets.map((asset) => (
          <Box 
            key={asset.id}
            display="grid" 
            gridTemplateColumns="1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr" 
            p={4}
            borderBottom="1px solid"
            borderColor="gray.100"
            _last={{ borderBottom: 'none' }}
          >
            <Box fontWeight="medium">{asset.name}</Box>
            <Box>{asset.asset_no}</Box>
            <Box>{asset.brand}</Box>
            <Box>
              <Badge colorScheme={getAssetTypeColor(asset.asset_type)}>
                {asset.asset_type}
              </Badge>
            </Box>
            <Box>{new Date(asset.upload_date).toLocaleDateString()}</Box>
            <Box>
              {asset.uploaded_by.username}
              {isAssetOwner(asset) && (
                <Badge ml={2} colorScheme="blue" fontSize="xs">You</Badge>
              )}
            </Box>
            <Box>{asset.view_count}</Box>
            <Box>
              <HStack gap={2}>
                {/* 所有角色都可以查看 */}
                <Button size="sm" colorScheme="blue">
                  View
                </Button>
                
                {/* 所有角色都可以下载 */}
                <Button size="sm" colorScheme="teal">
                  Download
                </Button>
                
                {/* 编辑权限：admin 可以编辑所有，editor 只能编辑自己的 */}
                {permissions.canEditAsset(asset.uploaded_by.id) && (
                  <Button size="sm" colorScheme="green">
                    Edit
                  </Button>
                )}
                
                {/* 删除权限：admin 可以删除所有，editor 只能删除自己的 */}
                {permissions.canDeleteAsset(asset.uploaded_by.id) && (
                  <Button size="sm" colorScheme="red">
                    Delete
                  </Button>
                )}
              </HStack>
            </Box>
          </Box>
        ))}
      </Box>

      {/* 空状态 */}
      {assets.length === 0 && (
        <Box textAlign="center" py={10}>
          <Text color="gray.500">No assets found.</Text>
          {/* 只有 Editor 才显示上传提示 */}
          {currentUser?.role === 'editor' && (
            <Button mt={4} colorScheme="blue" onClick={() => router.push('/dashboard/upload')}>
              Upload Your First Asset
            </Button>
          )}
        </Box>
      )}
    </VStack>
  )
}