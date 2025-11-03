'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
  Image,
  Center,
  Container,
} from '@chakra-ui/react';
import { apiRequest } from '@/lib/api';
import { downloadAsset } from '@/services/assets';

const extOf = (url: string) => {
  try {
    const p = new URL(url, 'http://dummy').pathname.toLowerCase();
    const m = p.match(/\.([a-z0-9]+)$/i);
    return m?.[1] ?? '';
  } catch {
    const m = (url || '').toLowerCase().match(/\.([a-z0-9]+)$/i);
    return m?.[1] ?? '';
  }
};

const toUrl = (raw?: string) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return `http://127.0.0.1:8000${raw.replace(/^\/?/, '/')}`;
};

type AssetDetail = {
  id: number;
  name: string;
  asset_type: string;
  file?: string;
  file_url?: string;
  url?: string;
  path?: string;
  description?: string;
  uploaded_by?: { username?: string };
  upload_date?: string;
};

export default function AssetPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!mounted) return;

      const urlId = searchParams.get('id');
      const urlFile = searchParams.get('file');
      const urlType = searchParams.get('type');

      if (urlFile) {
        setAsset({
          id: urlId ? Number(urlId) : 0,
          name: 'Preview',
          asset_type: (urlType as string) || 'document',
          file_url: urlFile,
        });
        setLoading(false);
        return;
      }

      if (urlId) {
        try {
          setLoading(true);
          const data = await apiRequest(`/api/assets/${urlId}/`, { method: 'GET' });
          setAsset(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    run();
  }, [mounted, searchParams]);

  const rawFile = useMemo(
    () => (asset as any)?.file_url || asset?.file || (asset as any)?.url || (asset as any)?.path,
    [asset]
  );
  const fileUrl = useMemo(() => toUrl(rawFile), [rawFile]);
  const ext = useMemo(() => extOf(fileUrl), [fileUrl]);

  if (!mounted || loading) {
    return (
      <VStack minH="100vh" align="center" justify="center" gap={3}>
        <Spinner size="xl" />
        <Text>Loading preview…</Text>
      </VStack>
    );
  }

  if (!asset || !fileUrl) {
    return (
      <VStack minH="100vh" align="center" justify="center" gap={3}>
        <Text fontWeight="bold" color="red.500">Asset not found</Text>
        <Button onClick={() => router.back()}>Go Back</Button>
      </VStack>
    );
  }

  const is3D = ['glb', 'gltf', 'obj', 'mtl'].includes(ext);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
  const isPdf = ext === 'pdf';

  const renderContent = () => {
    // 统一外框：灰底、圆角、阴影、内边距；媒体最大高度限制
    const frameProps = {
      bg: 'gray.50',
      border: '1px solid',
      borderColor: 'gray.200',
      borderRadius: 'md',
      boxShadow: 'sm',
      p: 4,
    } as const;

    if (is3D) {
      return (
        <Box {...frameProps}>
          <VStack gap={3} align="center" justify="center" minH="40vh" color="gray.600">
            <Text fontWeight="bold">3D preview is disabled on this page.</Text>
            <Text fontSize="sm">Use the inline card preview to interact with the model.</Text>
            <Button onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}>
              Open Raw File
            </Button>
          </VStack>
        </Box>
      );
    }

    if (isImage) {
      return (
        <Box {...frameProps}>
          <Center>
            <Image
              src={fileUrl}
              alt={asset?.name || 'image'}
              objectFit="contain"
              maxH="70vh"
              maxW="100%"
              borderRadius="md"
              boxShadow="md"
              bg="white"
            />
          </Center>
        </Box>
      );
    }

    if (isVideo) {
      return (
        <Box {...frameProps}>
          <Center>
            {/* 用原生 <video>，避免 Chakra as=video 的类型问题 */}
            <video
              src={fileUrl}
              controls
              preload="metadata"
              style={{
                maxHeight: '70vh',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                display: 'block',
                background: 'black',
              }}
            />
          </Center>
        </Box>
      );
    }

    if (isPdf) {
      return (
        <Box {...frameProps}>
          {/* 用原生 <iframe>，避免 Chakra as=iframe 的类型问题 */}
          <iframe
            src={fileUrl}
            title="PDF Preview"
            width="100%"
            style={{ height: '75vh', border: 'none', borderRadius: 8, background: 'white' }}
          />
        </Box>
      );
    }

    return (
      <Box {...frameProps}>
        <VStack gap={2} align="center" justify="center" minH="40vh" color="gray.500">
          <Text fontWeight="bold">Preview not available.</Text>
          <Button variant="outline" onClick={() => window.open(fileUrl, '_blank')}>
            Open File Directly
          </Button>
        </VStack>
      </Box>
    );
  };

  return (
    <VStack align="stretch" minH="100vh" gap={0}>
      {/* 顶部条 */}
      <HStack
        justify="space-between"
        align="center"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
        position="sticky"
        top={0}
        zIndex={1}
      >
        <HStack gap={3} maxW="70%">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <Heading size="md" truncate>
            {asset.name || 'Preview'}
          </Heading>
        </HStack>
        <HStack gap={2}>
          <Button
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
          >
            Open Raw File
          </Button>
          <Button
            colorScheme="green"
            loading={downloading}
            onClick={async () => {
              try {
                setDownloading(true);
                await downloadAsset(asset.id);
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? 'Downloading…' : 'Download'}
          </Button>
        </HStack>
      </HStack>

      {/* 内容区：居中 + 控制最大宽度 */}
      <Container maxW="container.lg" py={6}>
        {renderContent()}
      </Container>
    </VStack>
  );
}
