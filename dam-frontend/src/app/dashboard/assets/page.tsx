'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Image,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { getAssets, downloadAsset, type Asset } from '@/services/assets';

// 自定义 toast 函数替代 useToast
const showToast = (title: string, status: 'success' | 'error' | 'info' | 'warning', description?: string) => {
  console.log(`Toast: ${title} - ${status}`, description);
  // 在实际项目中，你可以集成 react-hot-toast 或其他 toast 库
  if (status === 'error') {
    alert(`Error: ${title} - ${description}`);
  } else if (status === 'success') {
    alert(`Success: ${title} - ${description}`);
  } else if (status === 'warning') {
    alert(`Warning: ${title} - ${description}`);
  } else {
    alert(`Info: ${title} - ${description}`);
  }
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const loadAssets = async () => {
    try {
      console.log('🔄 Starting to load assets...');
      setLoading(true);
      setError(null);
      
      const assetsData = await getAssets();
      console.log('✅ Assets data received:', assetsData);
      
      setAssets(assetsData);
      
    } catch (err) {
      console.error('❌ Error loading assets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      
      showToast('Load Failed', 'error', errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 Loading completed');
    }
  };

  useEffect(() => {
    console.log('🎯 AssetsPage mounted');
    loadAssets();
  }, []);

  // 处理图片加载错误
  const handleImageError = (assetId: number) => {
    console.log(`❌ Image load error for asset ${assetId}`);
    setImageErrors(prev => new Set(prev).add(assetId));
  };

  // 处理预览
  const handlePreview = async (asset: Asset) => {
    try {
      console.log('👁️ Previewing asset:', asset.name);
      const previewUrl = asset.file.startsWith('http') 
        ? asset.file 
        : `http://127.0.0.1:8000${asset.file}`;
      
      window.open(previewUrl, '_blank');
    } catch (err) {
      console.error('❌ Preview error:', err);
      showToast('Preview Failed', 'error', 'Unable to preview asset');
    }
  };

  // 处理下载 - 增强版本
  const handleDownload = async (asset: Asset) => {
    try {
      setDownloadingIds(prev => [...prev, asset.id]);
      console.log(`📥 Attempting to download: ${asset.name}`);
      
      await downloadAsset(asset.id);
      
      showToast('Download Started', 'success', `${asset.name} is being downloaded`);
      
    } catch (err) {
      console.error('❌ Download error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      const isManualDownload = errorMessage.includes('Save As');
      
      showToast(
        isManualDownload ? 'Manual Download Required' : 'Download Failed',
        isManualDownload ? 'warning' : 'error',
        errorMessage
      );
      
      if (isManualDownload) {
        // 如果是手动下载，额外显示一个持久的提示
        showToast(
          'How to Download',
          'info',
          'Right-click on the file in the new tab and select "Save As"'
        );
      }
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== asset.id));
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="400px">
          <VStack gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg" color="gray.600">Loading assets...</Text>
            <Text fontSize="sm" color="gray.500">Please wait while we fetch your assets</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box 
          bg="red.50" 
          border="1px" 
          borderColor="red.200" 
          borderRadius="md" 
          p={4}
          mb={4}
        >
          <Box>
            <Text fontWeight="bold" color="red.800">Unable to Load Assets</Text>
            <Text color="red.600">{error}</Text>
          </Box>
        </Box>
        
        <Button 
          onClick={loadAssets} 
          colorScheme="blue"
        >
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Digital Assets</Heading>
          <Text color="gray.600">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} found in system
          </Text>
        </Box>

        {assets.length === 0 ? (
          <Center height="200px" bg="gray.50" borderRadius="md">
            <VStack gap={3}>
              <Text fontSize="lg" color="gray.500" fontWeight="medium">
                No assets available
              </Text>
              <Text fontSize="sm" color="gray.400">
                Upload your first asset to get started
              </Text>
            </VStack>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {assets.map((asset) => (
              <Box 
                key={asset.id}
                border="1px" 
                borderColor="gray.200" 
                borderRadius="md"
                boxShadow="md"
                p={6}
                _hover={{
                  boxShadow: 'lg',
                  transform: 'translateY(-2px)',
                }}
                transition="all 0.2s"
              >
                <VStack gap={4} align="stretch">
                  {/* 资产预览图片 */}
                  <Box 
                    height="200px" 
                    bg="gray.100" 
                    borderRadius="md"
                    overflow="hidden"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor={imageErrors.has(asset.id) ? 'not-allowed' : 'pointer'}
                    onClick={() => !imageErrors.has(asset.id) && handlePreview(asset)}
                    _hover={{ opacity: imageErrors.has(asset.id) ? 1 : 0.9 }}
                  >
                    {asset.asset_type === 'image' && !imageErrors.has(asset.id) ? (
                      <Image
                        src={asset.file}
                        alt={asset.name}
                        objectFit="cover"
                        width="100%"
                        height="100%"
                        onError={() => handleImageError(asset.id)}
                      />
                    ) : (
                      <Center>
                        <VStack gap={2}>
                          {imageErrors.has(asset.id) ? (
                            <>
                              <Text fontSize="lg" color="red.500" fontWeight="bold">
                                ⚠️ File Missing
                              </Text>
                              <Text fontSize="sm" color="gray.500" textAlign="center">
                                The file does not exist on the server
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text fontSize="xl" fontWeight="bold" color="gray.500">
                                {asset.asset_type.toUpperCase()}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                Preview not available
                              </Text>
                            </>
                          )}
                        </VStack>
                      </Center>
                    )}
                  </Box>

                  {/* 资产信息 */}
                  <VStack gap={3} align="stretch">
                    <Heading size="sm">{asset.name}</Heading>
                    
                    <Text fontSize="sm" color="gray.600">
                      {asset.description}
                    </Text>
                    
                    <HStack justify="space-between">
                      <Badge 
                        colorScheme={
                          asset.asset_type === 'image' ? 'blue' : 
                          asset.asset_type === 'video' ? 'red' : 'green'
                        }
                      >
                        {asset.asset_type}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        ID: {asset.asset_no}
                      </Text>
                    </HStack>

                    <Text fontSize="sm">
                      <Text as="span" fontWeight="medium">Brand:</Text> {asset.brand || 'Not specified'}
                    </Text>
                    
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="medium">Uploaded by:</Text> {asset.uploaded_by.username}
                    </Text>
                    
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="medium">Date:</Text> {new Date(asset.upload_date).toLocaleDateString()}
                    </Text>

                    {/* 统计数据 */}
                    <HStack justify="space-between" fontSize="sm">
                      <HStack gap={1}>
                        <Text>👁️</Text>
                        <Text>{asset.view_count} views</Text>
                      </HStack>
                      <HStack gap={1}>
                        <Text>📥</Text>
                        <Text>{asset.download_count} downloads</Text>
                      </HStack>
                    </HStack>

                    {/* 标签 */}
                    {asset.tags && asset.tags.length > 0 && (
                      <HStack gap={1} flexWrap="wrap">
                        {asset.tags.map(tag => (
                          <Badge key={tag.id} colorScheme="gray" size="sm">
                            {tag.name}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                  </VStack>

                  {/* 操作按钮 */}
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      flex={1}
                      onClick={() => handlePreview(asset)}
                      disabled={imageErrors.has(asset.id)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="green"
                      flex={1}
                      onClick={() => handleDownload(asset)}
                      loading={downloadingIds.includes(asset.id)}
                      disabled={imageErrors.has(asset.id)}
                    >
                      {downloadingIds.includes(asset.id) ? 'Downloading...' : 'Download'}
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}