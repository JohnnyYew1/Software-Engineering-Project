// src/app/dashboard/assets/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
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

// 用大写组件名包装，自定义元素不会触发 TS 检查
const ModelViewer: any = 'model-viewer';

// 动态导入 Three OBJ+MTL 预览（禁 SSR）
const ThreeObjMtlViewer = dynamic(() => import('@/components/ThreeObjMtlViewer'), { ssr: false });

// —— Toast（保持你原来的风格）——
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

// 将后端相对路径拼成可访问 URL
const toUrl = (raw?: string) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://127.0.0.1:8000${raw.replace(/^\/?/, '/')}`;
};

// 下拉选项
const TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: '3D Model', value: '3d_model' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
] as const;

const ORDERING_OPTIONS = [
  { label: 'Latest', value: '-upload_date' },
  { label: 'Older', value: 'upload_date' },
  { label: 'A~Z', value: 'name' },
  { label: 'Popular', value: '-download_count' },
] as const;

type Filters = {
  search: string;
  asset_type: string;
  ordering: string;
};

// 扩展名工具
const getExt = (url: string) => {
  try {
    const pathname = new URL(url, 'http://dummy').pathname.toLowerCase();
    const m = pathname.match(/\.([a-z0-9]+)$/i);
    return m?.[1] ?? '';
  } catch {
    const lower = url.toLowerCase();
    const m = lower.match(/\.([a-z0-9]+)$/i);
    return m?.[1] ?? '';
  }
};
const isGlbOrGltf = (url: string) => {
  const ext = getExt(url);
  return ext === 'glb' || ext === 'gltf';
};
const isObjOrMtl = (url: string) => {
  const ext = getExt(url);
  return ext === 'obj' || ext === 'mtl';
};

// 预览卡片
function AssetPreviewBox({
  asset,
  onImageError,
}: {
  asset: AssetType;
  onImageError: (id: number) => void;
}) {
  const fileUrl = toUrl((asset as any).file_url || asset.file);

  if (asset.asset_type === 'image') {
    return (
      <Image
        src={fileUrl}
        alt={asset.name}
        objectFit="cover"
        width="100%"
        height="100%"
        onError={() => onImageError(asset.id)}
      />
    );
  }

  if (asset.asset_type === 'video') {
    return (
      <video
        src={fileUrl}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        controls
        preload="metadata"
      />
    );
  }

  if (asset.asset_type === '3d_model') {
    if (isObjOrMtl(fileUrl)) {
      return <ThreeObjMtlViewer srcUrl={fileUrl} />;
    }
    if (isGlbOrGltf(fileUrl)) {
      return (
        <ModelViewer
          src={fileUrl}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          camera-controls
          auto-rotate
          shadow-intensity="0.5"
          crossorigin="anonymous"
          exposure="1"
        />
      );
    }
    return (
      <Center p={3}>
        <VStack gap={2}>
          <Text fontSize="sm" color="red.500" fontWeight="bold">
            Unsupported 3D format: .{getExt(fileUrl) || 'unknown'}
          </Text>
          <Text fontSize="xs" color="gray.600" textAlign="center">
            3D preview supports .obj + .mtl or .glb / .gltf
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Center>
      <VStack gap={2}>
        <Text fontSize="xl" fontWeight="bold" color="gray.500">
          {(asset.asset_type || 'unknown').toUpperCase()}
        </Text>
        <Text fontSize="sm" color="gray.500">Preview not available</Text>
      </VStack>
    </Center>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    search: '',
    asset_type: '',
    ordering: '-upload_date',
  });

  const [searchInput, setSearchInput] = useState<string>('');

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

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageError = (assetId: number) => {
    setImageErrors((prev) => new Set(prev).add(assetId));
  };

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

  const FiltersBar = useMemo(
    () => (
      <Box border="1px" borderColor="gray.200" borderRadius="md" p={4} bg="white">
        <VStack align="stretch" gap={4}>
          <HStack align="flex-end" gap={4} flexWrap="wrap">
            <Box flex={1} minW="240px">
              <Text fontSize="sm" mb={1} color="gray.600">Search</Text>
              <HStack>
                <Input
                  placeholder="Search by name/description/tag"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button
                  colorScheme="blue"
                  onClick={() => {
                    const next: Filters = { ...filters, search: searchInput.trim() };
                    setFilters(next);
                    loadAssets(next);
                  }}
                >
                  Search
                </Button>
                <Button variant="outline" onClick={() => setSearchInput('')}>
                  Clear
                </Button>
              </HStack>
            </Box>

            <Box minW="200px">
              <Text fontSize="sm" mb={1} color="gray.600">Type</Text>
              <select
                value={filters.asset_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const next = { ...filters, asset_type: e.target.value };
                  setFilters(next);
                  loadAssets(next);
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
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Box>

            <Box minW="220px">
              <Text fontSize="sm" mb={1} color="gray.600">Ordering</Text>
              <select
                value={filters.ordering}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const next = { ...filters, ordering: e.target.value };
                  setFilters(next);
                  loadAssets(next);
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
                {ORDERING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Box>

            <Button
              onClick={() => {
                const next: Filters = { search: '', asset_type: '', ordering: '-upload_date' };
                setSearchInput('');
                setFilters(next);
                loadAssets(next);
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
    [filters, loading, searchInput]
  );

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="400px">
          <VStack gap={4}>
            <Spinner size="xl" />
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
        <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} mb={4}>
          <Text fontWeight="bold" color="red.800">Unable to Load Assets</Text>
          <Text color="red.600">{error}</Text>
        </Box>
        <Button onClick={() => loadAssets()} colorScheme="blue">Try Again</Button>
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
            {filters.search ? ` for "${filters.search}"` : ''}
          </Text>
        </Box>

        {FiltersBar}

        {assets.length === 0 ? (
          <Center height="200px" bg="gray.50" borderRadius="md">
            <VStack gap={3}>
              <Text fontSize="lg" color="gray.500" fontWeight="medium">No assets available</Text>
              <Text fontSize="sm" color="gray.400">Upload your first asset to get started</Text>
            </VStack>
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {assets.map((asset) => {
              const fileUrl = toUrl((asset as any).file_url || asset.file);

              return (
                <Box
                  key={asset.id}
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  boxShadow="md"
                  p={6}
                  _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  <VStack gap={4} align="stretch">
                    {/* 预览区 */}
                    <Box
                      height="200px"
                      bg="gray.100"
                      borderRadius="md"
                      overflow="hidden"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <AssetPreviewBox asset={asset} onImageError={id => setImageErrors(prev => new Set(prev).add(id))} />
                    </Box>

                    {/* 信息区 */}
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
                        <Text as="span" fontWeight="medium">Brand:</Text>{' '}
                        {(asset as any).brand ?? 'Not specified'}
                      </Text>

                      <Text fontSize="sm">
                        <Text as="span" fontWeight="medium">Uploaded by:</Text>{' '}
                        {asset.uploaded_by?.username ?? 'Unknown'}
                      </Text>

                      <Text fontSize="sm">
                        <Text as="span" fontWeight="medium">Date:</Text>{' '}
                        {asset.upload_date ? new Date(asset.upload_date).toLocaleDateString() : '—'}
                      </Text>

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
                      <Button size="sm" variant="outline" flex={1} onClick={() => window.open(fileUrl, '_blank')}>
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
