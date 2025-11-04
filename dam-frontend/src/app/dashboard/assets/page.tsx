'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Asset as AssetType, Tag } from '@/services/assets';
import PdfThumb from "@/components/PdfThumb"
import {
  getAssets,
  listTags,
  // ✅ 新增两个工具：真正下载 + 保存
  downloadAssetBlob,
  saveBlob,
} from '@/services/assets';
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
  Input
} from '@chakra-ui/react';

const ModelViewer: any = 'model-viewer';
const ThreeObjMtlViewer = dynamic(() => import('@/components/ThreeObjMtlViewer'), { ssr: false });

// 简易 toast：保持你的风格
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

const toUrl = (raw?: string) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://127.0.0.1:8000${raw.replace(/^\/?/, '/')}`;
};

const TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: '3D Model', value: '3d_model' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'PDF', value: 'pdf' }, // ✅ 新增
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
  date_from?: string;
  date_to?: string;
  tag_ids?: number[];
};

// 工具：解析扩展名
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

const [pdfThumbFailed, setPdfThumbFailed] = useState(false);
if (
  asset.asset_type === "pdf" ||
  (asset as any).mime_type?.toLowerCase()?.includes("pdf")
) {
  const fileUrl = toUrl((asset as any).file_url || asset.file);

  // 1) 优先用 PDF.js 缩略图（第一页）
  if (!pdfThumbFailed) {
    return (
      <Center p={2} w="100%" h="100%" bg="white">
        <VStack gap={2} w="100%">
          <PdfThumb
            assetId={asset.id}
            height={180}
            onError={() => setPdfThumbFailed(true)}
          />
          <Text
            fontSize="xs"
            color="gray.600"
            title={asset.name || "Document"}
            // Chakra v3 没有 noOfLines，用 CSS clamp 代替
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {asset.name || "Document"}
          </Text>
        </VStack>
      </Center>
    );
  }

  // 2) 缩略图失败 → 退回 <object>（若被 X-Frame-Options 拒绝，会渲染下面的 fallback）
  return (
    <Center p={0} w="100%" h="100%" bg="white" position="relative">
      <object
        data={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
        width="100%"
        height="100%"
      >
        {/* 3) 最终兜底：文字占位 */}
        <VStack gap={1} p={3}>
          <Text fontSize="lg" fontWeight="bold" color="red.600">
            PDF
          </Text>
          <Text
            fontSize="xs"
            color="gray.600"
            title={asset.name || "Document"}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {asset.name || "Document"}
          </Text>
        </VStack>
      </object>

      {/* 右下角角标增强“封面感” */}
      <Badge position="absolute" right="6px" bottom="6px" colorScheme="purple">
        PDF
      </Badge>
    </Center>
  );
}


  if (asset.asset_type === '3d_model') {
    const fileUrl = toUrl((asset as any).file_url || asset.file);
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

/** 下拉式多选标签（点击 Done 自动应用；OR 过滤；无第三方库） */
function TagMultiDropdown({
  all,
  selected,
  onChange,
  onApply,
  disabled,
  buttonLabel = 'Tags',
}: {
  all: Tag[];
  selected: number[];
  onChange: (nextIds: number[]) => void;
  onApply: () => void; // 点击 Done 时调用
  disabled?: boolean;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectedNames = useMemo(() => {
    const set = new Set(selected);
    return all.filter(t => set.has(t.id)).map(t => t.name);
  }, [all, selected]);

  const toggleId = (id: number) => {
    const has = selected.includes(id);
    if (has) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Box position="relative" ref={ref} minW="260px">
      <Text fontSize="sm" mb={1} color="gray.600">Tags</Text>
      <Button
        onClick={() => setOpen(o => !o)}
        variant="outline"
        disabled={disabled}
        width="100%"
        justifyContent="space-between"
      >
        <Box as="span">
          {buttonLabel}
          {selected.length > 0 ? ` (${selected.length})` : ''}
        </Box>
        <Box as="span" aria-hidden>▾</Box>
      </Button>

      {open && (
        <Box
          position="absolute"
          zIndex={10}
          mt={2}
          w="100%"
          maxH="260px"
          overflow="auto"
          bg="white"
          border="1px solid #E2E8F0"
          borderRadius="12px"
          boxShadow="lg"
          p={2}
        >
          {all.length === 0 ? (
            <Text fontSize="sm" color="gray.500" p={2}>No tags</Text>
          ) : (
            <VStack align="stretch" gap={1}>
              {all.map(tag => {
                const checked = selected.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: checked ? '#F7FAFC' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(tag.id)}
                    />
                    <span style={{ fontSize: 14 }}>{tag.name}</span>
                  </label>
                );
              })}
            </VStack>
          )}

          <Box my={2} borderTop="1px solid #E2E8F0" />
          <HStack justify="space-between">
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>
              Clear
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => {
                setOpen(false);
                onApply(); // ✅ 点击 Done 自动应用
              }}
            >
              Done
            </Button>
          </HStack>
        </Box>
      )}

      {/* 选中标签摘要（单行省略） */}
      {selectedNames.length > 0 && (
        <Box
          mt={2}
          fontSize="sm"
          color="gray.600"
          title={selectedNames.join(', ')}
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {selectedNames.join(', ')}
        </Box>
      )}
    </Box>
  );
}

export default function AssetsPage() {
  const router = useRouter();

  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // 标签字典 & 已选
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    asset_type: '',
    ordering: '-upload_date',
    date_from: undefined,
    date_to: undefined,
    tag_ids: [],
  });

  // 搜索与日期
  const [searchInput, setSearchInput] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // 拉取标签字典
  useEffect(() => {
    async function fetchTags() {
      try {
        const tags = await listTags();
        setAllTags(tags || []);
      } catch { /* ignore */ }
    }
    fetchTags();
  }, []);

  // 加载资产
  const loadAssets = async (_filters: Filters = filters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssets({
        search: _filters.search || undefined,
        asset_type: _filters.asset_type || undefined,
        ordering: _filters.ordering || undefined,
        date_from: _filters.date_from || undefined,
        date_to: _filters.date_to || undefined,
        // 把 number[] → '1,2,3'（后端更稳）
        tags: _filters.tag_ids && _filters.tag_ids.length
          ? _filters.tag_ids.join(',')
          : undefined,
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

  // ✅ 真正的下载逻辑（保存到本地）
  const handleDownload = async (asset: AssetType) => {
    const fileUrl = toUrl((asset as any).file_url || asset.file);
    try {
      setDownloadingIds((prev) => [...prev, asset.id]);

      // 1) 优先通过后端下载 API 拿 blob + 真实文件名
      const { blob, filename } = await downloadAssetBlob(asset.id);

      // 2) 兜底文件名：资源名 / URL 文件名 / 扩展名
      const fallbackBase =
        (asset.name && asset.name.trim()) ||
        (fileUrl && fileUrl.split('/').pop()) ||
        'download';
      const ext = getExt(fileUrl);
      const finalName = filename || (ext ? `${fallbackBase}.${ext}` : fallbackBase);

      // 3) 触发保存
      saveBlob(blob, finalName);

      showToast('Download Started', 'success', `${finalName}`);
    } catch (err) {
      // 如果 API 下载失败，降级：直接新开标签请求文件 URL（让浏览器处理下载/预览）
      const message = err instanceof Error ? err.message : 'Download failed';
      console.warn('download via API failed, fallback to window.open:', message);
      if (fileUrl) {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        showToast('Download Started (fallback)', 'info', 'Opened in a new tab');
      } else {
        showToast('Download Failed', 'error', message);
      }
    } finally {
      setDownloadingIds((prev) => prev.filter((id) => id !== asset.id));
    }
  };

  // “Done”自动应用
  const applyAllFilters = () => {
    const next: Filters = {
      ...filters,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      tag_ids: selectedTagIds,
    };
    setFilters(next);
    loadAssets(next);
  };

  // 美化后的过滤区
  const FiltersBar = useMemo(
    () => (
      <Box border="1px" borderColor="gray.200" borderRadius="xl" p={5} bg="white" boxShadow="sm">
        <VStack align="stretch" gap={4}>
          {/* 标题行 */}
          <HStack justify="space-between" align="center">
            <Heading size="md">Filters</Heading>
            <Button
              variant="outline"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSelectedTagIds([]);
                setSearchInput('');
                const next: Filters = {
                  search: '',
                  asset_type: '',
                  ordering: '-upload_date',
                  date_from: undefined,
                  date_to: undefined,
                  tag_ids: [],
                };
                setFilters(next);
                loadAssets(next);
              }}
            >
              Reset
            </Button>
          </HStack>

          {/* 控件区 */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
            {/* Search */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600">Search</Text>
              <HStack>
                <Input
                  placeholder=""
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
              </HStack>
            </Box>

            {/* Type */}
            <Box>
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
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                }}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Box>

            {/* Date From */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600">Date From</Text>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Box>

            {/* Date To */}
            <Box>
              <Text fontSize="sm" mb={1} color="gray.600">Date To</Text>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </Box>
          </SimpleGrid>

          {/* Tags */}
          <TagMultiDropdown
            all={allTags}
            selected={selectedTagIds}
            onChange={setSelectedTagIds}
            onApply={applyAllFilters}
            buttonLabel="Tags"
          />

          {/* Ordering */}
          <HStack justify="flex-end">
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
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                }}
              >
                {ORDERING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Box>
          </HStack>
        </VStack>
      </Box>
    ),
    [filters, searchInput, dateFrom, dateTo, selectedTagIds, allTags]
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
                              : asset.asset_type === 'pdf'
                              ? 'purple'
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
                      <Button
                        size="sm"
                        variant="outline"
                        flex={1}
                        onClick={() => {
                          const url = new URL('/dashboard/preview', window.location.origin);
                          url.searchParams.set('id', String(asset.id));
                          url.searchParams.set('file', fileUrl);
                          if ((asset as any).asset_type) url.searchParams.set('type', (asset as any).asset_type);
                          router.push(url.toString());
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="green"
                        flex={1}
                        onClick={() => handleDownload(asset)}
                        // 按你的要求：不用 isLoading
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
