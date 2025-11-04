'use client';

import VersionHistory from '@/components/VersionHistory';
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Flex, Input, Text, Badge, SimpleGrid, Grid, GridItem } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AssetItem,
  AssetVersion,
  getAssetById,
  getPreviewUrl,
  getAssetVersions,
  uploadNewVersion,
  restoreVersion,
  downloadAsset,
  saveBlob,
  trackView,
} from '@/services/assets';
import { authService } from '@/services/auth';
import { BASE_URL } from '@/lib/api';

// 3D 预览
const ThreeDPreview = dynamic(() => import('@/components/ThreeDPreview'), { ssr: false });

/** 霓虹按钮（无 sx；点击前后文字颜色不变；默认透明底） */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  const {
    color,          // 允许传白字等
    variant,        // 允许 ghost/solid 等
    ...rest
  } = props;

  return (
    <Button
      {...rest}
      variant={variant ?? 'ghost'}
      color={color}
      bg="transparent"
      borderRadius="md"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: '0 12px 28px rgba(59,130,246,0.25)',
        color: 'inherit',
      }}
      _active={{
        transform: 'translateY(0)',
        color: 'inherit',
      }}
      _focusVisible={{
        boxShadow: '0 0 0 0 rgba(0,0,0,0)',
      }}
      transition="all .15s ease"
    />
  );
}

function ensureAbsolute(u?: string): string {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}
function inferKind(url?: string, type?: string, mime?: string) {
  const u = (url || '').toLowerCase();
  const t = (type || '').toLowerCase();
  const m = (mime || '').toLowerCase();
  if (m.includes('pdf')) return 'pdf';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.includes('gltf') || m.includes('glb')) return '3d';
  if (t.includes('pdf')) return 'pdf';
  if (t.includes('image')) return 'image';
  if (t.includes('video')) return 'video';
  if (t.includes('3d')) return '3d';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(u)) return 'image';
  if (/\.(mp4|webm|ogg)(\?|$)/.test(u)) return 'video';
  if (/\.pdf(\?|$)/.test(u)) return 'pdf';
  if (/\.(gltf|glb|obj|mtl)(\?|$)/.test(u)) return '3d';
  return 'other';
}
function ext(url?: string): string {
  const u = (url || '').split('?')[0];
  const m = u.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] ?? '').toLowerCase();
}
type TabKey = 'history' | 'upload';

/** 资料行：左标签右值，自动换行，视觉对齐 */
/** 资料行：左标签右值，避免 p 嵌套 p */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid templateColumns="120px 1fr" columnGap={3} alignItems="center">
      <GridItem>
        {/* 左侧标签可以继续用 Text（单纯文字） */}
        <Text color="gray.600" fontWeight="semibold">
          {label}
        </Text>
      </GridItem>
      <GridItem>
        {/* 右侧内容用 Box（div），避免把 block/其它 <Text> 包进 <p> 里 */}
        <Box color="gray.800">
          {children}
        </Box>
      </GridItem>
    </Grid>
  );
}


export default function PreviewPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const idParam = sp.get('id');
  const assetId = idParam ? Number(idParam) : NaN;

  const me = authService.getCurrentUser();
  const myRole = (me?.role ?? 'viewer').toLowerCase() as 'admin' | 'editor' | 'viewer';
  const canWrite = myRole === 'admin' || myRole === 'editor';

  const [asset, setAsset] = useState<AssetItem | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [versionsNote, setVersionsNote] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('history');

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fatalPreviewErr, setFatalPreviewErr] = useState<string>('');

  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    (async () => { const a = await getAssetById(assetId); setAsset(a); })();
  }, [assetId]);

  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    let mounted = true;
    (async () => {
      setLoadingPreview(true);
      setFatalPreviewErr('');
      try {
        // 进入预览计次（services 内部已 sessionStorage 防抖）
        trackView(assetId)
          .then(() => setAsset(prev => (prev ? { ...prev, view_count: (prev.view_count ?? 0) + 1 } : prev)))
          .catch(() => {});

        let url = '';
        try { url = ensureAbsolute(await getPreviewUrl(assetId)); }
        catch { const a = await getAssetById(assetId); url = ensureAbsolute(a?.file_url); }
        if (!mounted) return;
        if (url) setFileUrl(url);
        else { setFileUrl(''); setFatalPreviewErr('No preview available for this asset.'); }
      } catch {
        if (!mounted) return;
        setFileUrl('');
        setFatalPreviewErr('Failed to load preview.');
      } finally {
        if (mounted) setLoadingPreview(false);
      }
    })();
    return () => { mounted = false; };
  }, [assetId]);

  async function refreshVersions() {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setLoadingList(true);
      setVersionsNote('');
      const list = await getAssetVersions(assetId);
      setVersions(list);
    } catch (e: any) {
      setVersions([]);
      setVersionsNote(typeof e?.message === 'string' && e.message ? `Version list unavailable: ${e.message}` : 'Version list unavailable.');
    } finally { setLoadingList(false); }
  }
  useEffect(() => { refreshVersions(); /* eslint-disable-line */ }, [assetId]);

  const kind = useMemo(() => inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type), [fileUrl, asset]);
  const extname = useMemo(() => ext(fileUrl), [fileUrl]);

  async function onDownloadCurrent() {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setDownloading(true);
      const blob = await downloadAsset(assetId);
      const filename =
        (asset?.name && asset?.name.trim()) ||
        (fileUrl && fileUrl.split('/').pop()) ||
        `download${extname ? '.' + extname : ''}`;
      saveBlob(blob, filename);
    } finally { setDownloading(false); }
  }

  async function onUploadNewVersion() {
    if (!assetId || Number.isNaN(assetId) || !file) return;
    try {
      setUploading(true);
      await uploadNewVersion(assetId, file, note || undefined);
      setFile(null); setNote('');
      await Promise.all([
        refreshVersions(),
        (async () => {
          try {
            const u = await getPreviewUrl(assetId);
            const url = ensureAbsolute(u);
            if (url) { setFileUrl(url); setFatalPreviewErr(''); }
            else {
              const a = await getAssetById(assetId);
              const f = ensureAbsolute(a?.file_url);
              setFileUrl(f);
              if (!f) setFatalPreviewErr('No preview available after upload.');
            }
          } catch {
            setFileUrl('');
            setFatalPreviewErr('Failed to refresh preview after upload.');
          }
        })(),
      ]);
      setActiveTab('history');
    } finally { setUploading(false); }
  }

  async function onRestore(v: AssetVersion) {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setRestoringId(v.version);
      await restoreVersion(assetId, v.version);
      await Promise.all([refreshVersions(), (async () => {
        try {
          const u = await getPreviewUrl(assetId);
          const url = ensureAbsolute(u);
          if (url) { setFileUrl(url); setFatalPreviewErr(''); }
          else {
            const a = await getAssetById(assetId);
            const f = ensureAbsolute(a?.file_url);
            setFileUrl(f);
            if (!f) setFatalPreviewErr('No preview available after restore.');
          }
        } catch {
          setFileUrl('');
          setFatalPreviewErr('Failed to refresh preview after restore.');
        }
      })()]);
    } finally { setRestoringId(null); }
  }

  function openPdfNewTab() {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Box p="24px" color="white">
      {/* 顶部条 */}
      <Flex align="center" gap="12px" mb="16px">
        {/* ← Back 白色且点击前后颜色一致 */}
        <NeonButton onClick={() => router.back()} color="white">
          ← Back
        </NeonButton>

        <Text fontSize="20px" fontWeight="bold" color="white">Asset Preview</Text>
        <div style={{ flex: 1 }} />

        {/* Download 白字 */}
        <NeonButton onClick={onDownloadCurrent} disabled={downloading || !assetId} color="white">
          {downloading ? 'Downloading...' : 'Download Current'}
        </NeonButton>
      </Flex>

      {/* 错误提示 */}
      {fatalPreviewErr && !fileUrl && (
        <Box
          mt="12px"
          p="12px"
          bg="rgba(220,38,38,0.90)"
          color="white"
          borderRadius="12px"
          border="1px solid rgba(248,113,113,0.9)"
          style={{ backdropFilter: 'blur(4px)' }}
          fontSize="14px"
        >
          {fatalPreviewErr}
        </Box>
      )}

      {/* 信息 + 预览（70% 半透明玻璃） */}
      <Box
        border="1px solid rgba(226,232,240,0.90)"
        borderRadius="20px"
        p="16px"
        mb="24px"
        bg="rgba(255,255,255,0.70)"
        boxShadow="0 20px 60px rgba(0,0,0,0.20)"
        style={{ backdropFilter: 'blur(10px)' }}
        color="gray.900"
      >
        <Flex align="flex-start" gap="20px" wrap="wrap">
          {/* 左侧资料：两列对齐，更整齐 */}
          <Box minW="320px" flex="0 0 360px">
            <SimpleGrid columns={1} gap={3}>
              <DetailRow label="Name:">{asset?.name ?? '-'}</DetailRow>
              <DetailRow label="Brand:">{asset?.brand ?? '-'}</DetailRow>
              <DetailRow label="Asset No:">{asset?.asset_no ?? '-'}</DetailRow>
              <DetailRow label="Type:">
                <Badge colorScheme="purple">{asset?.type ?? asset?.asset_type ?? '-'}</Badge>
              </DetailRow>
              <DetailRow label="Uploaded:">{asset?.upload_date ?? '-'}</DetailRow>
              <DetailRow label="Downloads:">{asset?.download_count ?? 0}</DetailRow>
              <DetailRow label="Views:">{asset?.view_count ?? 0}</DetailRow>
              <DetailRow label="Tags:">
                <Flex wrap="wrap" gap="6px">
                  {asset?.tags?.length
                    ? asset.tags.map((t) => <Badge key={t.id} variant="outline">{t.name}</Badge>)
                    : <Text color="gray.500">None</Text>}
                </Flex>
              </DetailRow>
            </SimpleGrid>
          </Box>

          {/* 右侧预览 */}
          <Box
            flex="1"
            minWidth="360px"
            minHeight="480px"
            border="1px dashed rgba(148,163,184,0.9)"
            p="12px"
            borderRadius="16px"
            bg="rgba(255,255,255,0.70)"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {loadingPreview && <Box color="gray.700">Loading preview…</Box>}

            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type) === 'image' && (
              <img
                src={fileUrl}
                alt={asset?.name || 'image'}
                style={{ maxHeight: 560, maxWidth: '100%', borderRadius: 12 }}
              />
            )}

            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type) === 'video' && (
              <video src={fileUrl} controls style={{ maxHeight: 560, width: '100%', borderRadius: 12 }} />
            )}

            {!loadingPreview && inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type) === 'pdf' && (
              <Box>
                <Flex gap="8px" mb="8px">
                  <NeonButton onClick={openPdfNewTab}>Open in new tab</NeonButton>
                  <NeonButton onClick={onDownloadCurrent}>Download PDF</NeonButton>
                </Flex>
                {fileUrl ? (
                  <object data={fileUrl} type="application/pdf" width="100%" style={{ minHeight: 560 }}>
                    <Box color="gray.700">
                      Unable to embed PDF inline. You can{' '}
                      <Button variant="plain" onClick={openPdfNewTab} p={0} h="auto" minW="unset">
                        <Text as="span" textDecor="underline" color="blue.600">open it in a new tab</Text>
                      </Button>{' '}
                      or download above.
                    </Box>
                  </object>
                ) : (
                  <Box color="gray.700">No PDF preview available.</Box>
                )}
              </Box>
            )}

            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type) === '3d' && (ext(fileUrl) === 'glb' || ext(fileUrl) === 'gltf') && (
              <div style={{ height: 560, width: '100%' }}>
                <ThreeDPreview fileUrl={fileUrl} />
              </div>
            )}

            {!loadingPreview && !fileUrl && <Box color="gray.700">No preview available.</Box>}
          </Box>
        </Flex>
      </Box>

      {/* Tabs：白字，点击前后颜色一致 */}
      <Flex gap="8px" mb="12px">
        <NeonButton color="white" onClick={() => setActiveTab('history')}>
          Version History
        </NeonButton>
        {canWrite && (
          <NeonButton color="white" onClick={() => setActiveTab('upload')}>
            Upload New Version
          </NeonButton>
        )}
      </Flex>

      {activeTab === 'history' && (
        <Box
          border="1px solid rgba(226,232,240,0.90)"
          borderRadius="20px"
          overflow="hidden"
          bg="rgba(255,255,255,0.70)"
          boxShadow="0 20px 60px rgba(0,0,0,0.20)"
          style={{ backdropFilter: 'blur(10px)' }}
          color="gray.900"
        >
          <Flex align="center" gap="12px" p="12px">
            <NeonButton onClick={refreshVersions} disabled={loadingList}>
              {loadingList ? 'Refreshing...' : 'Refresh'}
            </NeonButton>
            <Text color="gray.700" fontSize="14px">最新在最上面</Text>
            {versionsNote && <Text color="gray.700" fontSize="14px">（{versionsNote}）</Text>}
          </Flex>

          <Box as="table" w="100%" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
            <thead style={{ background: '#0b0f2b', color: '#E2E8F0' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: 10 }}>#</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Uploaded At</th>
                <th style={{ textAlign: 'left', padding: 10 }}>By</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Note</th>
                <th style={{ textAlign: 'left', padding: 10 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 10, color: '#64748b' }}>No versions yet.</td>
                </tr>
              )}
              {versions.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                  <td style={{ padding: 10 }}>v{v.version}</td>
                  <td style={{ padding: 10 }}>{v.created_at}</td>
                  <td style={{ padding: 10 }}>{v.uploaded_by?.username ?? '-'}</td>
                  <td style={{ padding: 10 }}>{v.note ?? '-'}</td>
                  <td style={{ padding: 10 }}>
                    <Flex gap="8px">
                      {v.file_url ? (
                        <a href={ensureAbsolute(v.file_url)} download target="_blank" rel="noreferrer">
                          <NeonButton size="sm">Download</NeonButton>
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" disabled>No URL</Button>
                      )}
                      {canWrite && (
                        <NeonButton
                          size="sm"
                          onClick={() => onRestore(v)}
                          disabled={restoringId === v.version}
                        >
                          {restoringId === v.version ? 'Restoring…' : 'Restore'}
                        </NeonButton>
                      )}
                    </Flex>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {activeTab === 'upload' && canWrite && (
        <Box
          border="1px solid rgba(226,232,240,0.90)"
          borderRadius="20px"
          p="16px"
          maxW="560px"
          bg="rgba(255,255,255,0.70)"
          boxShadow="0 20px 60px rgba(0,0,0,0.20)"
          style={{ backdropFilter: 'blur(10px)' }}
          color="gray.900"
        >
          <Box mb="12px">
            <Text mb="6px" color="gray.800">Select file</Text>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Box>
          <Box mb="12px">
            <Text mb="6px" color="gray.800">Note (optional)</Text>
            <Input placeholder="e.g. fix color correction" value={note} onChange={(e) => setNote(e.target.value)} />
          </Box>
          <Flex gap="8px">
            <NeonButton onClick={onUploadNewVersion} disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Upload New Version'}
            </NeonButton>
            <Button
              variant="ghost"
              onClick={() => { setFile(null); setNote(''); }}
              disabled={uploading}
            >
              Clear
            </Button>
          </Flex>
          <Text mt="8px" fontSize="sm" color="gray.700">提交后，当前预览将自动指向新版本。</Text>
        </Box>
      )}
    </Box>
  );
}
