'use client';

import {
  Heading,
  VStack,
  Box,
  Button,
  Input,
  Textarea,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { permissions } from '@/utils/permissions';
import { apiRequest } from '@/lib/api';
import { listTags } from '@/services/assets';

type Tag = { id: number; name: string; color?: string };

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 原有元数据
  const [assetData, setAssetData] = useState({
    name: '',
    description: '',
    brand: '',
    assetNo: '',
  });

  // 标签：从后端加载 + 已选择
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // 下拉面板开关 & 暂存勾选（点击 Done 才生效）
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [stagedTagIds, setStagedTagIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // 权限检查（无权则 3 秒后跳回 assets 列表）
  useEffect(() => {
    if (!permissions.canUpload()) {
      setMessage({
        type: 'error',
        text: 'Access denied. You do not have permission to upload assets. Redirecting to assets page...',
      });
      const t = setTimeout(() => {
        router.push('/dashboard/assets');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [router]);

  // 自动清除提示
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 载入标签（统一来自后端 Tag 表）
  useEffect(() => {
    async function fetchTags() {
      try {
        const tags = await listTags();
        setAllTags(tags || []);
      } catch {
        // 静默失败
      }
    }
    fetchTags();
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!tagDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
        setStagedTagIds(selectedTagIds); // 还原
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [tagDropdownOpen, selectedTagIds]);

  // 打开时，用当前已选初始化暂存
  const openTagDropdown = () => {
    setStagedTagIds(selectedTagIds);
    setTagDropdownOpen(true);
  };

  const toggleStage = (id: number) => {
    setStagedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyTags = () => {
    setSelectedTagIds(stagedTagIds);
    setTagDropdownOpen(false);
  };

  const selectedTagNames = useMemo(() => {
    if (!selectedTagIds.length) return 'No tags';
    const map = new Map(allTags.map((t) => [t.id, t.name]));
    return selectedTagIds.map((id) => map.get(id) || String(id)).join(', ');
  }, [selectedTagIds, allTags]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const handleFileSelect = (file: File) => {
    // 支持：JPG/PNG、GLB、MP4、PDF
    const validExtensions = ['jpg', 'jpeg', 'png', 'glb', 'mp4', 'pdf'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && validExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAssetData((prev) => ({ ...prev, name: prev.name || fileNameWithoutExt }));
      setMessage(null);
    } else {
      setMessage({
        type: 'error',
        text: 'Please upload supported file types: JPG, PNG (images), GLB (3D), MP4 (videos), or PDF (documents)',
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  const handleInputChange =
    (field: keyof typeof assetData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAssetData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  // 真正上传
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }
    if (!assetData.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter an asset name' });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('name', assetData.name);
      fd.append('file', selectedFile);

      // 资产类型判断（含 glb → 3d_model、pdf）
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const assetType =
        ['jpg', 'jpeg', 'png'].includes(ext)
          ? 'image'
          : ext === 'mp4'
          ? 'video'
          : ext === 'glb'
          ? '3d_model'
          : ext === 'pdf'
          ? 'pdf'
          : 'document';
      fd.append('asset_type', assetType);

      if (assetData.description) fd.append('description', assetData.description);
      if (assetData.brand) fd.append('brand', assetData.brand);
      if (assetData.assetNo) fd.append('asset_no', assetData.assetNo);

      // 关键：把多选 tag 的 id 列表逐项 append
      selectedTagIds.forEach((id) => fd.append('tag_ids', String(id)));

      await apiRequest('/api/assets/', {
        method: 'POST',
        body: fd,
        isFormData: true,
      });

      // 成功重置
      setSelectedFile(null);
      setAssetData({ name: '', description: '', brand: '', assetNo: '' });
      setSelectedTagIds([]);
      setStagedTagIds([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setMessage({ type: 'success', text: 'Asset uploaded successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAssetData({ name: '', description: '', brand: '', assetNo: '' });
    setSelectedTagIds([]);
    setStagedTagIds([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage(null);
  };

  const getFileTypeDisplay = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'Image';
    if (ext === 'glb') return '3D Model';
    if (ext === 'mp4') return 'Video';
    if (ext === 'pdf') return 'PDF';
    return 'File';
  };

  // 无权限时的提示
  if (!permissions.canUpload()) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading>Upload Asset</Heading>
        <Box
          bg="red.50"
          color="red.800"
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.200"
          textAlign="center"
        >
          <Text fontWeight="bold" mb={2}>Access Denied</Text>
          <Text>
            You do not have permission to upload assets. Only Editor role can upload assets.
            Redirecting to assets page...
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading>Upload Asset</Heading>

      {message && (
        <Box
          bg={message.type === 'error' ? 'red.50' : 'green.50'}
          color={message.type === 'error' ? 'red.800' : 'green.800'}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={message.type === 'error' ? 'red.200' : 'green.200'}
        >
          {message.text}
        </Box>
      )}

      {/* 拖拽/点击选择文件 */}
      <Box
        border="2px dashed"
        borderColor={dragOver ? 'blue.400' : 'gray.300'}
        borderRadius="lg"
        p={8}
        textAlign="center"
        bg={dragOver ? 'blue.50' : 'gray.50'}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        cursor="pointer"
        transition="all 0.2s"
        onClick={() => fileInputRef.current?.click()}
      >
        <VStack gap={4}>
          <Text fontSize="xl" fontWeight="bold">
            {selectedFile ? 'File Selected' : 'Drag & Drop Files Here'}
          </Text>
          <Text color="gray.600">
            {selectedFile ? selectedFile.name : 'or click to select files from your computer'}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Supports: JPG, PNG (Images), GLB (3D Models), MP4 (Videos), PDF (Documents)
          </Text>
          {!selectedFile && <Button colorScheme="blue">Select Files</Button>}
        </VStack>

        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept=".jpg,.jpeg,.png,.glb,.mp4,.pdf"
          display="none"
        />
      </Box>

      {/* 文件信息 + 表单 */}
      {selectedFile && (
        <VStack align="stretch" gap={4} p={6} borderWidth="1px" borderRadius="lg" bg="white">
          <Heading size="md">File Information</Heading>

          <Box>
            <Text fontWeight="medium" mb={2}>Selected File:</Text>
            <Text color="gray.600">{selectedFile.name}</Text>
            <Text fontSize="sm" color="gray.500">
              Type: {getFileTypeDisplay(selectedFile.name)} | Size:{' '}
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </Box>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="medium" mb={2}>Asset Name *</Text>
              <Input
                placeholder="Enter asset name"
                value={assetData.name}
                onChange={handleInputChange('name')}
              />
            </Box>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>Asset Number</Text>
                <Input
                  placeholder="Enter asset number"
                  value={assetData.assetNo}
                  onChange={handleInputChange('assetNo')}
                />
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>Brand</Text>
                <Input
                  placeholder="Enter brand"
                  value={assetData.brand}
                  onChange={handleInputChange('brand')}
                />
              </Box>
            </HStack>

            <Box>
              <Text fontWeight="medium" mb={2}>Description</Text>
              <Textarea
                placeholder="Describe this asset..."
                rows={4}
                value={assetData.description}
                onChange={handleInputChange('description')}
              />
            </Box>

            {/* ✅ 标签多选（下拉 → 勾选 → Done 应用） */}
            <Box position="relative" ref={dropdownRef as any}>
              <Text fontWeight="medium" mb={2}>Tags</Text>

            <Button
                variant="outline"
                onClick={openTagDropdown}
                style={{ justifyContent: 'space-between', width: '100%' }}
              >
              <HStack justify="space-between" width="100%">
               <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={selectedTagNames}
               >
                    {selectedTagNames}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>▾</span>
                </HStack>
              </Button>

              {tagDropdownOpen && (
                <Box
                  position="absolute"
                  zIndex={20}
                  bg="white"
                  border="1px solid #E2E8F0"
                  borderRadius="8px"
                  mt={2}
                  w="100%"
                  boxShadow="md"
                  p={2}
                >
                  <Box
                    maxHeight="220px"
                    overflowY="auto"
                    style={{ padding: '6px 4px' }}
                  >
                    {allTags.length === 0 && (
                      <Text fontSize="sm" color="gray.500" p={2}>
                        No tags available. (Managed by Admin)
                      </Text>
                    )}

                    {allTags.map((t) => {
                      const checked = stagedTagIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 6px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                          onMouseDown={(e) => e.preventDefault()} // 避免点选导致 Button 失焦关闭
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStage(t.id)}
                          />
                          <span style={{ fontSize: 14 }}>{t.name}</span>
                        </label>
                      );
                    })}
                  </Box>

                  <HStack justify="flex-end" gap={2} p={2}>
                    <Button size="sm" variant="outline" onClick={() => { setTagDropdownOpen(false); setStagedTagIds(selectedTagIds); }}>
                      Cancel
                    </Button>
                    <Button size="sm" colorScheme="blue" onClick={applyTags}>
                      Done
                    </Button>
                  </HStack>
                </Box>
              )}

              {selectedTagIds.length > 0 && (
                <Text mt={2} fontSize="sm" color="gray.600">
                  Selected: {selectedTagNames}
                </Text>
              )}
              {selectedTagIds.length === 0 && (
                <Text mt={2} fontSize="sm" color="gray.500">
                  * Tags are managed by Admin in Django Admin. Editors can only select existing tags.
                </Text>
              )}
            </Box>

            <HStack gap={4} mt={4}>
              <Button
                colorScheme="blue"
                onClick={handleUpload}
                loading={uploading}
                loadingText="Uploading..."
              >
                Upload Asset
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </HStack>
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
