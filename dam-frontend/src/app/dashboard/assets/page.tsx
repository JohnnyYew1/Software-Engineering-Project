// src/app/dashboard/assets/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Input,
} from '@chakra-ui/react';

// —— Toast（保持你原本的风格）——
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

// —— 拼接可访问 URL（优先后端 file_url）——
const toUrl = (raw?: string) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://127.0.0.1:8000${raw.replace(/^\/?/, '/')}`;
};

type Filters = {
  search: string;
  asset_type: string;      // '', 'image', 'video', 'pdf', 'document'
  ordering: string;        // '-upload_date', 'upload_date', 'name'
};

export default function AssetsPage() {
  // —— 列表状态 —— //
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // —— 过滤状态 —— //
  const [filters, setFilters] = useState<Filters>({
    search: '',
    asset_type: '',
    ordering: '-upload_date',
  });

  // 独立的搜索输入框内容（只有点 Search 才应用到 filters.search）
  const [searchInput, setSearchInput] = useState<string>('');

  // —— 加载函数 —— //
  const loadAssets = async (_filters: Filters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssets({
        search: _filters.search || undefined,
        asset_type: _filters.asset_type || undefined,
        ordering: _filters.ordering || undefined,
      });
      setAssets(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load assets';
      setError(msg);
      showToast('Load Failed', 'error', msg);
    } finally {
      setLoading(false);
    }
  };

  // 首次进入加载
  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 图片加载错误
  const handleImageError = (assetId: number) => {
    setImageErrors((prev) => new Set(prev).add(assetId));
  };

  // 预览（新开页）
  const handlePreview = async (asset: AssetType) => {
    try {
      const previewUrl = toUrl((asset as any).file_url || asset.file);
      if (!previewUrl) throw new Error('No preview url');
      window.open(previewUrl, '_blank');
    } catch {
      showToast('Preview Failed', 'error', 'Unable to preview asset');
    }
  };

  // 下载（方案1：downloadAsset 内部完成 blob 保存）
  const handleDownload = async (asset: AssetType) => {
    try {
      setDownloadingIds((prev) => [...prev, asset.id]);
      await downloadAsset(asset.id);
      showToast('Download Started', 'success', `${asset.name} is being downloaded`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      showToast('Download Failed', 'error', message);
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== asset.id));
    }
  };

  // —— 过滤栏 —— //
  const FiltersBar = useMemo(
    () => (
      <Box
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        bg="white"
      >
        <VStack align="stretch" gap={4}>
          {/* 搜索 + 类型 + 排序 */}
          <HStack align="flex-end" gap={4} flexWrap="wrap">
            <Box flex={1} minW="240px">
              <Text fontSize="sm" mb={1} color="gray.600">
                Search
              </Text>
              <HStack>
                <Input
                  placeholder="Search by name/description/tag"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const next: Filters = { ...filters, search: searchInput };
                    setFilters(next);
                    loadAssets(next); // ✅ 只有点击才发请求
                  }}
                  colorScheme="blue"
                >
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSearchInput('')} // 只清输入框，不触发请求
                >
                  Clear
                </Button>
              </HStack>
            </Box>

            <Box minW="200px">
              <Text fontSize="sm" mb={1} color="gray.600">
                Type
              </Text>
              {/* 原生 select：onChange 绑在 select 自身，避免 Chakra Box 类型报错 */}
              <select
                value={filters.asset_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const next = { ...filters, asset_type: e.target.value };
                  setFilters(next);
                  loadAssets(next); // 类型变化立即生效
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                }}
              >
                <option value="">All</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="document">Document</option>
              </select>
            </Box>

            <Box minW="220px">
              <Text fontSize="sm" mb={1} color="gray.600">
                Ordering
              </Text>
              <select
                value={filters.ordering}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const next = { ...filters, ordering: e.target.value };
                  setFilters(next);
                  loadAssets(next); // 排序变化立即生效
                }}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                }}
              >
                <option value="-upload_date">Newest</option>
                <option value="upload_date">Oldest</option>
                <option value="name">Name A→Z</option>
              </select>
            </Box>

            <Button
              onClick={() => {
                const next: Filters = {
                  search: '',
                  asset_type: '',
                  ordering: '-upload_date',
                };
                setSearchInput('');
                setFilters(next);
                loadAssets(next); // 重置并刷新
              }}
              variant="outline"
              loading={loading}
            >
              Reset
            </Button>
          </HStack>
        </VStack>
      </Box>
    ),
    // 依赖于 filters 与 loading（searchInput 只影响输入框，不必重算整块）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, loading, searchInput]
  );

  // —— 渲染 —— //
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

        <Button onClick={() => loadAssets()} colorScheme="blue">
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
            {filters.search ? ` for "${filters.search}"` : ''}
          </Text>
        </Box>

        {/* 过滤栏 */}
        {FiltersBar}

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
                            <Badge key={tag.id} colorScheme="gray">
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
