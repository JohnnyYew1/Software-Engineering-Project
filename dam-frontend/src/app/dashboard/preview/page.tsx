'use client';

import VersionHistory from '@/components/VersionHistory';
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Flex, Input, Text, Badge, SimpleGrid, Grid, GridItem,
} from '@chakra-ui/react';
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

// ========== 主题常量（与 Users/Tags 页一致的粉色玻璃拟态） ==========
const PINK_BG      = 'rgba(253, 242, 248, 0.80)';   // 背景
const PINK_BG_ALT  = 'rgba(253, 242, 248, 0.92)';   // 行条纹
const PINK_BORDER  = 'rgba(244, 114, 182, 0.45)';   // 边框
const PINK_SHADOW  = '0 18px 48px rgba(244, 114, 182, 0.25)';

// 3D 预览
const ThreeDPreview = dynamic(() => import('@/components/ThreeDPreview'), { ssr: false });

/** 霓虹按钮（白字、透明底、渐变描边） */
function NeonButton(props: React.ComponentProps<typeof Button>) {
  const { color, variant, ...rest } = props;
  return (
    <Button
      {...rest}
      variant={variant ?? 'ghost'}
      color={color ?? 'white'}
      bg="transparent"
      borderRadius="md"
      position="relative"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        padding: '1px',
        background: 'linear-gradient(90deg,#f472b6,#8b5cf6)', // 与用户页一致：粉→紫
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }}
      _hover={{
        transform: 'translateY(-1px)',
        boxShadow: '0 12px 28px rgba(244, 114, 182, 0.25)',
      }}
      _active={{ transform: 'translateY(0)' }}
      _focusVisible={{ boxShadow: 'none' }}
      transition="all .15s ease"
    />
  );
}

/** 工具函数 */
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

/** 资料行：左标签右值，避免 p 嵌套 p */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Grid templateColumns="120px 1fr" columnGap={3} alignItems="center">
      <GridItem>
        <Text color="gray.700" fontWeight="semibold">{label}</Text>
      </GridItem>
      <GridItem>
        <Box color="#1A202C">{children}</Box>
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
        <NeonButton onClick={() => router.back()}>← Back</NeonButton>
        <Text fontSize="20px" fontWeight="bold" color="white">Asset Preview</Text>
        <div style={{ flex: 1 }} />
        <NeonButton onClick={onDownloadCurrent} disabled={downloading || !assetId}>
          {downloading ? 'Downloading...' : 'Download Current'}
        </NeonButton>
      </Flex>

      {/* 错误提示（保持红色条） */}
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

      {/* 信息 + 预览 —— 粉色玻璃卡片 */}
      <Box
        border={`1px solid ${PINK_BORDER}`}
        borderRadius="20px"
        p="16px"
        mb="24px"
        bg={PINK_BG}
        boxShadow={PINK_SHADOW}
        style={{ backdropFilter: 'blur(10px)' }}
        color="gray.900"
      >
        <Flex align="flex-start" gap="20px" wrap="wrap">
          {/* 左侧资料 */}
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
                    : <Text color="gray.600">None</Text>}
                </Flex>
              </DetailRow>
            </SimpleGrid>
          </Box>

          {/* 右侧预览区（与卡片同风格） */}
          <Box
            flex="1"
            minWidth="360px"
            minHeight="480px"
            border={`1px dashed ${PINK_BORDER}`}
            p="12px"
            borderRadius="16px"
            bg={PINK_BG_ALT}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {loadingPreview && <Box color="gray.700">Loading preview…</Box>}

            {!loadingPreview && fileUrl && kind === 'image' && (
              <img
                src={fileUrl}
                alt={asset?.name || 'image'}
                style={{ maxHeight: 560, maxWidth: '100%', borderRadius: 12 }}
              />
            )}

            {!loadingPreview && fileUrl && kind === 'video' && (
              <video src={fileUrl} controls style={{ maxHeight: 560, width: '100%', borderRadius: 12 }} />
            )}

            {!loadingPreview && kind === 'pdf' && (
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

            {!loadingPreview && fileUrl && kind === '3d' && (ext(fileUrl) === 'glb' || ext(fileUrl) === 'gltf') && (
              <div style={{ height: 560, width: '100%' }}>
                <ThreeDPreview fileUrl={fileUrl} />
              </div>
            )}

            {!loadingPreview && !fileUrl && <Box color="gray.700">No preview available.</Box>}
          </Box>
        </Flex>
      </Box>

      {/* Tabs（白字按钮） */}
      <Flex gap="8px" mb="12px">
        <NeonButton onClick={() => setActiveTab('history')}>Version History</NeonButton>
        {canWrite && <NeonButton onClick={() => setActiveTab('upload')}>Upload New Version</NeonButton>}
      </Flex>

      {/* 历史版本表 —— 粉色玻璃表格，深色表头，条纹行 */}
      {activeTab === 'history' && (
        <Box
          border={`1px solid ${PINK_BORDER}`}
          borderRadius="20px"
          overflow="hidden"
          bg={PINK_BG}
          boxShadow={PINK_SHADOW}
          style={{ backdropFilter: 'blur(10px)' }}
          color="#1A202C"
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
              {versions.map((v, i) => (
                <tr
                  key={v.id}
                  style={{
                    borderTop: `1px solid ${PINK_BORDER}`,
                    background: i % 2 === 0 ? PINK_BG_ALT : PINK_BG,
                  }}
                >
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

      {/* 上传新版本 —— 粉色卡片 */}
      {activeTab === 'upload' && canWrite && (
        <Box
          border={`1px solid ${PINK_BORDER}`}
          borderRadius="20px"
          p="16px"
          maxW="560px"
          bg={PINK_BG}
          boxShadow={PINK_SHADOW}
          style={{ backdropFilter: 'blur(10px)' }}
          color="#1A202C"
        >
          <Box mb="12px">
            <Text mb="6px" color="gray.800">Select file</Text>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} bg="white" />
          </Box>
          <Box mb="12px">
            <Text mb="6px" color="gray.800">Note (optional)</Text>
            <Input
              placeholder="e.g. fix color correction"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              bg="white"
            />
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
