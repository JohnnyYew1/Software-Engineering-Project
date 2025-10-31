

'use client'
export const dynamic = 'force-dynamic'
import { 
  Heading, 
  VStack, 
  HStack, 
  Input, 
  Button, 
  Box,
  Text
} from '@chakra-ui/react'

export default function AssetsPage() {
  // 模拟资产数据
  const assets = [
    { id: 1, name: 'Company Logo', assetNo: 'AST001', brand: 'Nike', type: 'Image', uploadDate: '2024-01-15', user: 'John Doe' },
    { id: 2, name: 'Product Catalog', assetNo: 'AST002', brand: 'Apple', type: 'Document', uploadDate: '2024-01-14', user: 'Jane Smith' },
    { id: 3, name: 'Marketing Video', assetNo: 'AST003', brand: 'Samsung', type: 'Video', uploadDate: '2024-01-13', user: 'Mike Johnson' },
  ]

  return (
    <VStack align="stretch" gap={6}>
      <Heading>Assets</Heading>
      
      {/* 搜索和过滤栏 */}
      <HStack gap={4}>
        <Input placeholder="Search assets..." flex={1} />
        
        {/* 使用原生 select 替代 Chakra Select */}
        <Box as="select" borderWidth="1px" borderRadius="md" p={2} width="200px" bg="white">
          <option value="">Filter by type</option>
          <option value="image">Image</option>
          <option value="3d-model">3D Model</option>
          <option value="document">Document</option>
          <option value="video">Video</option>
        </Box>
        
        <Box as="select" borderWidth="1px" borderRadius="md" p={2} width="200px" bg="white">
          <option value="">Sort by</option>
          <option value="latest">Latest Upload</option>
          <option value="most-viewed">Most Viewed</option>
        </Box>
      </HStack>

      {/* 使用简单的 Box 布局替代 Table */}
      <VStack align="stretch" gap={4}>
        {/* 表头 */}
        <HStack bg="gray.50" p={4} borderRadius="md" fontWeight="bold">
          <Box flex={2}>Asset Name</Box>
          <Box flex={1}>Asset No.</Box>
          <Box flex={1}>Brand</Box>
          <Box flex={1}>Type</Box>
          <Box flex={1}>Upload Date</Box>
          <Box flex={1}>User</Box>
          <Box flex={1}>Actions</Box>
        </HStack>
        
        {/* 表格内容 */}
        {assets.map((asset) => (
          <HStack key={asset.id} p={4} borderWidth="1px" borderRadius="md" bg="white">
            <Box flex={2} fontWeight="medium">{asset.name}</Box>
            <Box flex={1}>{asset.assetNo}</Box>
            <Box flex={1}>{asset.brand}</Box>
            <Box flex={1}>{asset.type}</Box>
            <Box flex={1}>{asset.uploadDate}</Box>
            <Box flex={1}>{asset.user}</Box>
            <Box flex={1}>
              <HStack gap={2}>
                <Button size="sm" colorScheme="blue">View</Button>
                <Button size="sm" colorScheme="green">Edit</Button>
                <Button size="sm" colorScheme="gray">Download</Button>
              </HStack>
            </Box>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}