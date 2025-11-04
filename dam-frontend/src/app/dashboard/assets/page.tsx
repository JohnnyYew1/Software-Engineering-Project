/* FULL FILE: src/app/dashboard/assets/page.tsx */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Asset as AssetType, Tag } from '@/services/assets';
import PdfThumb from '@/components/PdfThumb';
import {
  getAssets,
  listTags,
  downloadAssetBlob,
  saveBlob,
  deleteAsset, // 删除 API
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
  Input,
} from '@chakra-ui/react';
import { authService } from '@/services/auth';
import { permissions } from '@/utils/permissions';

/* ===== 主题色：粉色玻璃拟态 ===== */
const PINK_BG = 'rgba(253, 242, 248, 0.80)';         // 背景
const PINK_BG_ALT = 'rgba(253, 242, 248, 0.92)';     // 行条纹
const PINK_BORDER = 'rgba(244, 114, 182, 0.45)';     // 边框
const PINK_SHADOW = '0 18px 48px rgba(244, 114, 182, 0.25)'; // 阴影

const ModelViewer: any = 'model-viewer';
const ThreeObjMtlViewer = dynamic(
  () => import('@/components/ThreeObjMtlViewer'),
  { ssr: false }
);

/* ===== Helpers ===== */
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
  { label: 'PDF', value: 'pdf' },
] as const;

// 下拉“我的上传”特殊值
const ORDERING_MY_UPLOADS = '__MY_UPLOADS__';

const ORDERING_OPTIONS = [
  { label: 'Latest', value: '-upload_date' },
  { label: 'Older', value: 'upload_date' },
  { label: 'A~Z', value: 'name' },
  { label: 'Most downloaded', value: '-download_count' },
  { label: 'Most viewed', value: '-view_count' },
  { label: 'My uploads', value: ORDERING_MY_UPLOADS },
] as const;

type Filters = {
  search: string;
  asset_type: string;
  ordering: string;
  date_from?: string;
  date_to?: string;
  tag_ids?: number[];
  uploaded_by?: number; // 仅显示该用户上传
};

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

/* ===== Video first-frame thumbnail (no controls on card) ===== */
function VideoThumb({ src, alt }: { src: string; alt?: string }) {
  const [thumb, setThumb] = useState<string>('');

  useEffect(() => {
    let disposed = false;
    const video = document.createElement('video');
    video.src = src;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const onLoadedMeta = () => {
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 10);
      } catch {}
    };

    const onSeekedOrLoaded = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = Math.max(1, Math.floor(video.videoWidth));
        const h = Math.max(1, Math.floor(video.videoHeight));
        const targetH = 280;
        const scale = targetH / h;
        canvas.width = Math.floor(w * scale);
        canvas.height = Math.floor(h * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.7);
        if (!disposed) setThumb(url);
      } catch {}
      cleanup();
    };

    const cleanup = () => {
      video.pause();
      video.src = '';
      video.removeAttribute('src');
      video.load();
    };

    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('seeked', onSeekedOrLoaded);
    video.addEventListener('loadeddata', onSeekedOrLoaded);
    video.load();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [src]);

  if (!thumb) {
    return (
      <Center p={3} w="100%" h="100%" bg="blackAlpha.50">
        <VStack gap={1}>
          <Text fontSize="lg" fontWeight="bold" color="gray.100">
            Video
          </Text>
          <Text fontSize="xs" color="gray.300">
            Open Preview to play
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Image
      src={thumb}
      alt={alt || 'video thumbnail'}
      objectFit="cover"
      width="100%"
      height="100%"
      draggable={false}
    />
  );
}

/* ===== Tag multi-select dropdown ===== */
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
  onApply: () => void;
  disabled?: boolean;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        if (open) {
          setOpen(false);
          onApply(); // 点外自动应用
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onApply]);

  const selectedNames = useMemo(() => {
    const set = new Set(selected);
    return all.filter((t) => set.has(t.id)).map((t) => t.name);
  }, [all, selected]);

  const toggleId = (id: number) => {
    const has = selected.includes(id);
    if (has) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Box position="relative" ref={ref} minW="280px">
      <Text fontSize="sm" mb={1} color="white" fontWeight="semibold" letterSpacing="0.2px">
        Tags
      </Text>
      <Button
        onClick={() => setOpen((o) => !o)}
        variant={open ? 'solid' : 'outline'}
        color="white"
        borderRadius="lg"
        bg={
          open
            ? 'linear-gradient(90deg, rgba(96,165,250,.35), rgba(167,139,250,.35))'
            : 'transparent'
        }
        _hover={{
          bg: 'linear-gradient(90deg, rgba(96,165,250,.45), rgba(167,139,250,.45))',
          transform: 'translateY(-1px)',
        }}
        transition="all .15s ease"
        width="100%"
        justifyContent="space-between"
        borderColor="rgba(255,255,255,0.35)"
        disabled={disabled}
      >
        <Box as="span" fontWeight="medium">
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
          maxH="320px"
          overflow="auto"
          bg="rgba(255,255,255,0.70)"
          border="1px solid rgba(226,232,240,0.90)"
          borderRadius="16px"
          boxShadow="0 20px 60px rgba(0,0,0,0.20)"
          p={6}
          style={{ backdropFilter: 'blur(10px)' }}
        >
          {all.length === 0 ? (
            <Text fontSize="sm" color="gray.600">No tags</Text>
          ) : (
            <VStack align="stretch" gap={2}>
              {all.map((tag) => {
                const checked = selected.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: checked ? '#F7FAFC' : 'transparent',
                      cursor: 'pointer',
                      border: '1px solid #EDF2F7',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(tag.id)}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        color: '#2D3748',
                        fontWeight: checked ? 600 : 400,
                      }}
                    >
                      {tag.name}
                    </span>
                  </label>
                );
              })}
            </VStack>
          )}
        </Box>
      )}

      {selectedNames.length > 0 && (
        <Box
          mt={2}
          fontSize="sm"
          color="gray.200"
          title={selectedNames.join(', ')}
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {selectedNames.join(', ')}
        </Box>
      )}
    </Box>
  );
}

/* ===== Futuristic Search Bar ===== */
function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search assets & brands…',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  return (
    <Box
      position="relative"
      borderRadius="full"
      p="2px"
      background="linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(147,51,234,0.35) 100%)"
      boxShadow="0 0 24px rgba(59,130,246,.25)"
    >
      <HStack
        bg="rgba(0,0,0,0.25)"
        style={{ backdropFilter: 'blur(8px)' }}
        border="1px solid rgba(255,255,255,0.18)"
        borderRadius="full"
        px={4}
        py={2}
        gap={2}
      >
        <Box as="span" aria-hidden fontSize="lg" lineHeight="1" opacity={0.9} color="white">🔎</Box>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          variant="outline"
          border="none"
          boxShadow="none"
          color="white"
          _placeholder={{ color: 'gray.200' }}
          _focusVisible={{ boxShadow: 'none', border: 'none' }}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
        />
        <Button
          onClick={onSubmit}
          variant="solid"
          borderRadius="full"
          px={5}
          _hover={{ transform: 'translateY(-1px)' }}
          transition="all .15s ease"
        >
          Search
        </Button>
      </HStack>
    </Box>
  );
}

/* ===== Asset preview box ===== */
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
    return <VideoThumb src={fileUrl} alt={asset.name} />;
  }

  const [pdfThumbFailed, setPdfThumbFailed] = useState(false);
  if (
    asset.asset_type === 'pdf' ||
    (asset as any).mime_type?.toLowerCase()?.includes('pdf')
  ) {
    const fileUrlLocal = toUrl((asset as any).file_url || asset.file);

    if (!pdfThumbFailed) {
      return (
        <Center p={2} w="100%" h="100%" bg="white">
          <VStack gap={2} w="100%">
            <PdfThumb
              assetId={asset.id}
              height={220}
              onError={() => setPdfThumbFailed(true)}
            />
            <Text
              fontSize="xs"
              color="gray.600"
              title={asset.name || 'Document'}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {asset.name || 'Document'}
            </Text>
          </VStack>
        </Center>
      );
    }

    return (
      <Center p={0} w="100%" h="100%" bg="white" position="relative">
        <object
          data={`${fileUrlLocal}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          type="application/pdf"
          width="100%"
          height="100%"
        >
          <VStack gap={1} p={3}>
            <Text fontSize="lg" fontWeight="bold" color="red.600">PDF</Text>
            <Text
              fontSize="xs"
              color="gray.600"
              title={asset.name || 'Document'}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {asset.name || 'Document'}
            </Text>
          </VStack>
        </object>
        <Badge position="absolute" right="6px" bottom="6px" colorScheme="purple">
          PDF
        </Badge>
      </Center>
    );
  }

  if (asset.asset_type === '3d_model') {
    const fu = toUrl((asset as any).file_url || asset.file);
    if (isObjOrMtl(fu)) {
      return <ThreeObjMtlViewer srcUrl={fu} />;
    }
    if (isGlbOrGltf(fu)) {
      return (
        <ModelViewer
          src={fu}
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
            Unsupported 3D format: .{getExt(fu) || 'unknown'}
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
        <Text fontSize="xl" fontWeight="bold" color="gray.600">
          {(asset.asset_type || 'unknown').toUpperCase()}
        </Text>
        <Text fontSize="sm" color="gray.500">Preview not available</Text>
      </VStack>
    </Center>
  );
}

/* ===== 小组件：对齐用 ===== */
function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <HStack align="start" gap={3}>
      <Box flexShrink={0} w="88px" textAlign="right">
        <Text fontSize="sm" color="gray.600" fontWeight="semibold">
          {label}
        </Text>
      </Box>
      <Box flex="1" minW={0}>
        <Text fontSize="sm" color="gray.800" truncate>
          {value ?? '—'}
        </Text>
      </Box>
    </HStack>
  );
}

function MetricsBar({ views, downloads }: { views: number; downloads: number }) {
  return (
    <SimpleGrid columns={2} gap={3} alignItems="center">
      <HStack gap={2}>
        <Text as="span" aria-hidden>👁️</Text>
        <Text fontSize="sm" color="gray.600">Views</Text>
      </HStack>
      <Text fontSize="sm" color="gray.900" fontWeight="semibold" textAlign="right">
        {views ?? 0}
      </Text>

      <HStack gap={2}>
        <Text as="span" aria-hidden>📥</Text>
        <Text fontSize="sm" color="gray.600">Downloads</Text>
      </HStack>
      <Text fontSize="sm" color="gray.900" fontWeight="semibold" textAlign="right">
        {downloads ?? 0}
      </Text>
    </SimpleGrid>
  );
}

/* ===== Page ===== */
export default function AssetsPage() {
  const router = useRouter();

  const currentUser = useMemo(() => {
    try { return authService.getCurrentUser?.() ?? null; } catch { return null; }
  }, []);

  const [assets, setAssets] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    asset_type: '',
    ordering: '-upload_date',
    date_from: undefined,
    date_to: undefined,
    tag_ids: [],
    uploaded_by: undefined,
  });

  // Pagination
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const [searchInput, setSearchInput] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  /* load tags */
  useEffect(() => {
    async function fetchTags() {
      try {
        const tags = await listTags();
        setAllTags(tags || []);
      } catch {}
    }
    fetchTags();
  }, []);

  /* load assets */
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
        uploaded_by:
          typeof _filters.uploaded_by === 'number'
            ? _filters.uploaded_by
            : undefined,
        tags:
          _filters.tag_ids && _filters.tag_ids.length
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

  const resetToFirst = () => setCurrentPage(1);

  const handleImageError = (assetId: number) => {
    setImageErrors((prev) => new Set(prev).add(assetId));
  };

  const handleDownload = async (asset: AssetType) => {
    const fileUrl = toUrl((asset as any).file_url || asset.file);
    try {
      setDownloadingIds((prev) => [...prev, asset.id]);
      const { blob, filename } = await downloadAssetBlob(asset.id);
      const fallbackBase =
        (asset.name && asset.name.trim()) ||
        (fileUrl && fileUrl.split('/').pop()) ||
        'download';
      const ex = getExt(fileUrl);
      const finalName = filename || (ex ? `${fallbackBase}.${ex}` : fallbackBase);
      saveBlob(blob, finalName);
      showToast('Download Started', 'success', `${finalName}`);
    } catch (err) {
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

  // 删除
  const handleDelete = async (asset: AssetType) => {
    const canDelete =
      (String(currentUser?.role || '').toLowerCase() === 'admin') ||
      permissions.canDeleteAsset(currentUser as any, {
        id: asset.id,
        uploaded_by: asset.uploaded_by || null,
      });

    if (!canDelete) {
      showToast('Permission denied', 'error', 'You cannot delete this asset');
      return;
    }

    const yes = confirm(`Delete "${asset.name || 'asset'}"? This cannot be undone.`);
    if (!yes) return;

    try {
      setDeletingIds((s) => [...s, asset.id]);
      await deleteAsset(asset.id);
      showToast('Deleted', 'success', 'The asset has been removed');
      await loadAssets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast('Delete failed', 'error', msg);
    } finally {
      setDeletingIds((s) => s.filter((id) => id !== asset.id));
    }
  };

  const applyAllFilters = () => {
    const next: Filters = {
      ...filters,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      tag_ids: selectedTagIds,
    };
    setFilters(next);
    resetToFirst();
    loadAssets(next);
  };

  /* ==== Background ==== */
  const Background = (
    <Box
      position="fixed"
      inset="0"
      zIndex={0}
      pointerEvents="none"
      background="
        radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248, 0.18), transparent 60%),
        radial-gradient(800px 500px at 90% 0%, rgba(139, 92, 246, 0.18), transparent 60%),
        linear-gradient(180deg, #0a1022 0%, #0b0f2b 35%, #0d1236 100%)
      "
    />
  );

  /* Top header */
  const TopHeader = (
    <VStack align="stretch" gap={3} zIndex={1} position="relative">
      <Box>
        <Heading size="lg" mb={1} color="white" letterSpacing="0.3px">
          Digital Assets
        </Heading>
        <Text color="gray.200">
          {assets.length} asset{assets.length !== 1 ? 's' : ''} found
          {filters.search ? ` for "${filters.search}"` : ''}
          {typeof filters.uploaded_by === 'number' ? ' • showing my uploads' : ''}
        </Text>
      </Box>

      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => {
          const next: Filters = { ...filters, search: searchInput.trim() };
          setFilters(next);
          resetToFirst();
          loadAssets(next);
        }}
        placeholder="Search assets & brands…"
      />
    </VStack>
  );

  // 当前是否处于 “我的上传”
  const myOnly = useMemo(() => {
    if (!currentUser?.id) return false;
    return String(filters.uploaded_by ?? '') === String(currentUser.id);
  }, [filters.uploaded_by, currentUser?.id]);

  const displayedOrderingValue = myOnly ? ORDERING_MY_UPLOADS : filters.ordering;

  /* Control bar */
  const ControlBar = (
    <HStack justify="space-between" align="center" zIndex={1} position="relative">
      {/* 左侧：Filter 按钮（粉色卡片） */}
      <Button
        variant={filterOpen ? 'solid' : 'outline'}
        color="white"
        borderRadius="md"
        bg={filterOpen ? 'linear-gradient(90deg,#f472b6,#8b5cf6)' : 'transparent'}
        borderColor="rgba(255,255,255,0.35)"
        _hover={{
          bg: 'linear-gradient(90deg,#f472b6,#8b5cf6)',
          transform: 'translateY(-1px)',
        }}
        transition="all .15s ease"
        onClick={() => setFilterOpen((o) => !o)}
      >
        {filterOpen ? 'Filter (open)' : 'Filter'}
      </Button>

      {/* 右侧：Ordering 下拉（外套粉色描边容器） */}
      <HStack gap={3} minW={{ base: '50%', md: '360px' }}>
        <Box flex="1">
          <Text fontSize="sm" mb={1} color="white" fontWeight="medium" letterSpacing="0.2px">
            Ordering
          </Text>
          <Box
            borderRadius="12px"
            p="2px"
            background="linear-gradient(135deg, rgba(244,114,182,.30), rgba(139,92,246,.30))"
            style={{ backdropFilter: 'blur(6px)' }}
          >
            <select
              value={displayedOrderingValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const val = e.target.value;
                if (val === ORDERING_MY_UPLOADS) {
                  const next: Filters = {
                    ...filters,
                    ordering: filters.ordering || '-upload_date',
                    uploaded_by:
                      typeof currentUser?.id === 'number'
                        ? currentUser.id
                        : currentUser?.id
                        ? Number(currentUser.id)
                        : undefined,
                  };
                  setFilters(next);
                  resetToFirst();
                  loadAssets(next);
                } else {
                  const patch: Filters = {
                    ...filters,
                    ordering: val,
                    uploaded_by: myOnly ? undefined : filters.uploaded_by,
                  };
                  setFilters(patch);
                  resetToFirst();
                  loadAssets(patch);
                }
              }}
              style={{
                borderRadius: '10px',
                padding: '10px',
                width: '100%',
                background: 'rgba(255,255,255,0.80)',
                border: '1px solid rgba(226,232,240,0.90)',
                color: '#1A202C',
              }}
            >
              {ORDERING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Box>
        </Box>
      </HStack>
    </HStack>
  );

  /* Filter panel —— 统一粉色玻璃风格 */
  const FilterPanel = filterOpen ? (
    <Box
      mt={3}
      p={5}
      borderRadius="20px"
      bg={PINK_BG}
      border={`1px solid ${PINK_BORDER}`}
      boxShadow={PINK_SHADOW}
      zIndex={1}
      position="relative"
      style={{ backdropFilter: 'blur(10px)' }}
    >
      <VStack align="stretch" gap={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          {/* Type */}
          <Box>
            <Text fontSize="sm" mb={1} color="gray.800" fontWeight="semibold" letterSpacing="0.2px">
              Type
            </Text>
            <select
              value={filters.asset_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const next = { ...filters, asset_type: e.target.value };
                setFilters(next);
                resetToFirst();
                loadAssets(next);
              }}
              style={{
                borderRadius: '12px',
                padding: '10px',
                width: '100%',
                background: '#fff',
                border: '1px solid #E2E8F0',
                color: '#1A202C',
              }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Box>

          {/* Date From */}
          <Box>
            <Text fontSize="sm" mb={1} color="gray.800" fontWeight="semibold" letterSpacing="0.2px">
              Date From
            </Text>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              borderRadius="12px"
              bg="white"
            />
          </Box>

          {/* Date To */}
          <Box>
            <Text fontSize="sm" mb={1} color="gray.800" fontWeight="semibold" letterSpacing="0.2px">
              Date To
            </Text>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              borderRadius="12px"
              bg="white"
            />
          </Box>
        </SimpleGrid>

        {/* Tags */}
        <TagMultiDropdown
          all={allTags}
          selected={selectedTagIds}
          onChange={setSelectedTagIds}
          onApply={() => {
            const next: Filters = {
              ...filters,
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
              tag_ids: selectedTagIds,
            };
            setFilters(next);
            resetToFirst();
            loadAssets(next);
          }}
          buttonLabel="Tags"
        />

        <HStack justify="flex-end">
          <Button
            variant="outline"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setSelectedTagIds([]);
              const next: Filters = {
                ...filters,
                asset_type: '',
                date_from: undefined,
                date_to: undefined,
                tag_ids: [],
                uploaded_by: undefined,
              };
              setFilters(next);
              resetToFirst();
              loadAssets(next);
            }}
          >
            Reset
          </Button>
          <Button variant="solid" onClick={applyAllFilters} colorScheme="pink" borderRadius="full">
            Apply
          </Button>
        </HStack>
      </VStack>
    </Box>
  ) : null;

  /* Pagination (client-side) */
  const totalPages = Math.max(1, Math.ceil(assets.length / PAGE_SIZE));
  const pageAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return assets.slice(start, start + PAGE_SIZE);
  }, [assets, currentPage]);

  const Pagination = (
    <HStack justify="center" mt={2} gap={2}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
      >
        Prev
      </Button>
      {Array.from({ length: totalPages }).map((_, i) => {
        const page = i + 1;
        const active = page === currentPage;
        return (
          <Button
            key={page}
            size="sm"
            variant={active ? 'solid' : 'outline'}
            colorScheme={active ? 'pink' : undefined}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </Button>
        );
      })}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </HStack>
  );

  if (loading) {
    return (
      <Box position="relative" minH="100vh">
        {Background}
        <Container maxW="container.xl" py={8} zIndex={1} position="relative">
          <Center minH="400px">
            <VStack gap={4}>
              <Spinner size="xl" color="white" />
              <Text fontSize="lg" color="gray.200">Loading assets...</Text>
              <Text fontSize="sm" color="gray.400">Please wait while we fetch your assets</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box position="relative" minH="100vh">
        {Background}
        <Container maxW="container.xl" py={8} zIndex={1} position="relative">
          <Box
            bg={PINK_BG}
            border={`1px solid ${PINK_BORDER}`}
            borderRadius="20px"
            p={4}
            mb={4}
            style={{ backdropFilter: 'blur(8px)' }}
            boxShadow={PINK_SHADOW}
          >
            <Text fontWeight="bold" color="#7F1D1D">Unable to Load Assets</Text>
            <Text color="#991B1B">{error}</Text>
          </Box>
          <Button onClick={() => loadAssets()} colorScheme="pink">Try Again</Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box position="relative" minH="100vh">
      {Background}

      <Container maxW="container.xl" py={8} zIndex={1} position="relative">
        <VStack gap={6} align="stretch">
          {TopHeader}
          {ControlBar}
          {FilterPanel}

          {pageAssets.length === 0 ? (
            <Box
              p={8}
              borderRadius="20px"
              bg={PINK_BG}
              border={`1px solid ${PINK_BORDER}`}
              boxShadow={PINK_SHADOW}
              textAlign="center"
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <VStack gap={3}>
                <Text fontSize="lg" color="#1A202C" fontWeight="medium">
                  No assets available
                </Text>
                <Text fontSize="sm" color="#334155">Try adjusting filters</Text>
              </VStack>
            </Box>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                {pageAssets.map((asset, idx) => {
                  const fileUrl = toUrl((asset as any).file_url || asset.file);

                  // 是否可删：Admin 可删所有；Editor 仅能删自己；Viewer 不可删
                  const canDelete =
                    (String(currentUser?.role || '').toLowerCase() === 'admin') ||
                    permissions.canDeleteAsset(currentUser as any, {
                      id: asset.id,
                      uploaded_by: asset.uploaded_by || null,
                    });

                  return (
                    <Box
                      key={asset.id}
                      borderRadius="20px"
                      p={0}
                      overflow="hidden"
                      bg={idx % 2 === 0 ? PINK_BG_ALT : PINK_BG}
                      border={`1px solid ${PINK_BORDER}`}
                      boxShadow={PINK_SHADOW}
                      style={{ backdropFilter: 'blur(8px)' }}
                      _hover={{
                        boxShadow: '0 24px 80px rgba(244,114,182,0.35)',
                        transform: 'translateY(-3px)',
                      }}
                      transition="all .2s ease"
                    >
                      {/* bigger preview */}
                      <Box height="280px" overflow="hidden" bg="gray.100">
                        <AssetPreviewBox
                          asset={asset}
                          onImageError={(id) =>
                            setImageErrors((prev) => new Set(prev).add(id))
                          }
                        />
                      </Box>

                      {/* info */}
                      <VStack align="stretch" gap={4} p={5} color="gray.800">
                        {/* 标题 + 类型 */}
                        <HStack justify="space-between" align="start">
                          <Heading
                            size="sm"
                            lineHeight="1.2"
                            color="gray.900"
                            letterSpacing="0.2px"
                            truncate
                          >
                            {asset.name}
                          </Heading>
                          <Badge
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontWeight="semibold"
                            letterSpacing="0.2px"
                            colorScheme={
                              asset.asset_type === 'image'
                                ? 'blue'
                                : asset.asset_type === 'video'
                                ? 'red'
                                : asset.asset_type === 'pdf'
                                ? 'purple'
                                : 'green'
                            }
                            textTransform="none"
                          >
                            {asset.asset_type}
                          </Badge>
                        </HStack>

                        {/* 描述 */}
                        <Text fontSize="sm" color="gray.700" lineHeight="1.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {(asset as any).description || 'No description'}
                        </Text>

                        {/* 明细 */}
                        <VStack align="stretch" gap={1}>
                          <DetailRow label="Brand:" value={(asset as any).brand ?? '—'} />
                          <DetailRow label="By:" value={asset.uploaded_by?.username ?? 'Unknown'} />
                          <DetailRow
                            label="Date:"
                            value={
                              asset.upload_date
                                ? new Date(asset.upload_date).toLocaleDateString()
                                : '—'
                            }
                          />
                          <DetailRow label="ID:" value={(asset as any).asset_no ?? asset.id} />
                        </VStack>

                        {/* 指标 */}
                        <MetricsBar
                          views={(asset as any).view_count ?? 0}
                          downloads={(asset as any).download_count ?? 0}
                        />

                        {/* 标签 */}
                        {asset.tags && asset.tags.length > 0 && (
                          <HStack gap={1} flexWrap="wrap">
                            {asset.tags.map((tag) => (
                              <Badge
                                key={tag.id}
                                colorScheme="gray"
                                variant="subtle"
                                borderRadius="full"
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </HStack>
                        )}

                        {/* actions */}
                        <HStack gap={2} pt={1}>
                          <Button
                            size="sm"
                            variant="outline"
                            flex={1}
                            onClick={() => {
                              const url = new URL('/dashboard/preview', window.location.origin);
                              url.searchParams.set('id', String(asset.id));
                              url.searchParams.set('file', fileUrl);
                              if ((asset as any).asset_type)
                                url.searchParams.set('type', (asset as any).asset_type);
                              router.push(url.toString());
                            }}
                            _hover={{ transform: 'translateY(-1px)' }}
                            transition="all .15s ease"
                          >
                            Preview
                          </Button>

                          <Button
                            size="sm"
                            colorScheme="pink"
                            variant="solid"
                            flex={1}
                            onClick={() => handleDownload(asset)}
                            disabled={downloadingIds.includes(asset.id)}
                            _hover={{ transform: 'translateY(-1px)' }}
                            transition="all .15s ease"
                          >
                            {downloadingIds.includes(asset.id) ? 'Downloading…' : 'Download'}
                          </Button>

                          {canDelete && (
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="solid"
                              onClick={() => handleDelete(asset)}
                              disabled={deletingIds.includes(asset.id)}
                              _hover={{ transform: 'translateY(-1px)' }}
                              transition="all .15s ease"
                            >
                              {deletingIds.includes(asset.id) ? 'Deleting…' : 'Delete'}
                            </Button>
                          )}
                        </HStack>
                      </VStack>
                    </Box>
                  );
                })}
              </SimpleGrid>

              {Pagination}
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
