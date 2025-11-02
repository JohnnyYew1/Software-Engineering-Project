// src/app/dashboard/assets/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Asset as AssetType } from '@/services/assets';
import { getAssets, downloadAsset } from '@/services/assets';
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

// 自定义 toast（保持你原写法）
const showToast = (
  title: string,
  status: 'success' | 'error' | 'info' | 'warning',
  description?: string
) => {
  console.log(`Toast: ${title} - ${status}`, description);
  if (status === 'error') alert(`Error: ${title} - ${description}`);
  else if (status === 'success') alert(`Success: ${title} - ${description}`);
  else if (status === 'warning') alert(`Warning: ${title} - ${description}`);
  else alert(`Info: ${title} - ${description}`);
};

// 统一拼接可访问 URL（优先后端给的 file_url）
const toUrl = (raw?: string) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://127.0.0.1:8000${raw.replace(/^\/?/, '/')}`;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const assetsData = await getAssets();
      setAssets(assetsData || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load assets';
      setError(errorMessage);
      showToast('Load Failed', 'error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // 图片加载错误
  const handleImageError = (assetId: number) => {
    setImageErrors((prev) => new Set(prev).add(assetId));
  };

  // 预览：优先 file_url，其次 file；都没有则报错
  const handlePreview = async (asset: AssetType) => {
    try {
      const previewUrl = toUrl((asset as any).file_url || asset.file);
      if (!previewUrl) throw new Error('No preview url');
      window.open(previewUrl, '_blank');
    } catch (err) {
      showToast('Preview Failed', 'error', 'Unable to preview asset');
    }
  };

  /**
   * ✅ 方案1：隐藏 <a download> 方式触发下载（不会新开标签页，也不会 404）
   * - downloadAsset(id) 必须返回真正的文件直链（例如 http://127.0.0.1:8000/media/xxx.png）
   * - 不再使用 window.open(url, '_blank')
   */
  const handleDownload = async (asset: AssetType) => {
    try {
      setDownloadingIds((prev) => [...prev, asset.id]);
      // 拿到后端提供的最终文件直链
      const fileUrl = await downloadAsset(asset.id);
      if (!fileUrl) throw new Error('No downloadable url');

      // 创建隐藏 <a> 并触发点击（不会打开新页面）
      const a = document.createElement('a');
      a.href = fileUrl;
      // 可选：给默认文件名（如果后端响应头含 Content-Disposition，会以响应头为准）
      a.download = asset.name || 'download';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Download Started', 'success', `${asset.name} is being downloaded`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      showToast('Download Failed', 'error', errorMessage);
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== asset.id));
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="400px">
          <VStack gap={4}>
            <Spinner size="xl" />
            <Text fontSize="lg" color="gray.600">
              Loading assets...
            </Text>
            <Text fontSize="sm" color="gray.500">
              Please wait while we fetch your assets
            </Text>
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
            <Text fontWeight="bold" color="red.800">
              Unable to Load Assets
            </Text>
            <Text color="red.600">{error}</Text>
          </Box>
        </Box>

        <Button onClick={loadAssets} colorScheme="blue">
          Try Again
        </Button>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Digital Assets
          </Heading>
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
            {assets.map((asset) => {
              const previewableImage =
                asset.asset_type === 'image' &&
                !imageErrors.has(asset.id) &&
                !!((asset as any).file_url || asset.file);

              const imageSrc = toUrl((asset as any).file_url || asset.file);

              return (
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
                      cursor={previewableImage ? 'pointer' : 'default'}
                      onClick={() => previewableImage && handlePreview(asset)}
                      _hover={{ opacity: previewableImage ? 0.9 : 1 }}
                    >
                      {previewableImage ? (
                        <Image
                          src={imageSrc}
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
                                  {(asset.asset_type || 'unknown').toUpperCase()}
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
                        {(asset as any).description || 'No description'}
                      </Text>

                      <HStack justify="space-between">
                        <Badge
                          colorScheme={
                            asset.asset_type === 'image'
                              ? 'blue'
                              : asset.asset_type === 'video'
                              ? 'red'
                              : 'green'
                          }
                        >
                          {asset.asset_type}
                        </Badge>
                        <Text fontSize="sm" color="gray.500">
                          ID: {(asset as any).asset_no ?? asset.id}
                        </Text>
                      </HStack>

                      <Text fontSize="sm">
                        <Text as="span" fontWeight="medium">
                          Brand:
                        </Text>{' '}
                        {(asset as any).brand ?? 'Not specified'}
                      </Text>

                      <Text fontSize="sm">
                        <Text as="span" fontWeight="medium">
                          Uploaded by:
                        </Text>{' '}
                        {asset.uploaded_by?.username ?? 'Unknown'}
                      </Text>

                      <Text fontSize="sm">
                        <Text as="span" fontWeight="medium">
                          Date:
                        </Text>{' '}
                        {asset.upload_date
                          ? new Date(asset.upload_date).toLocaleDateString()
                          : '—'}
                      </Text>

                      {/* 统计 */}
                      <HStack justify="space-between" fontSize="sm">
                        <HStack gap={1}>
                          <Text>👁️</Text>
                          <Text>{(asset as any).view_count ?? 0} views</Text>
                        </HStack>
                        <HStack gap={1}>
                          <Text>📥</Text>
                          <Text>{(asset as any).download_count ?? 0} downloads</Text>
                        </HStack>
                      </HStack>

                      {/* 标签 */}
                      {asset.tags && asset.tags.length > 0 && (
                        <HStack gap={1} flexWrap="wrap">
                          {asset.tags.map((tag) => (
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
                        variant="outline"
                        flex={1}
                        onClick={() => handlePreview(asset)}
                        disabled={imageErrors.has(asset.id) && asset.asset_type === 'image'}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="green"
                        flex={1}
                        onClick={() => handleDownload(asset)}
                        loading={downloadingIds.includes(asset.id)}
                      >
                        {downloadingIds.includes(asset.id) ? 'Downloading...' : 'Download'}
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}
