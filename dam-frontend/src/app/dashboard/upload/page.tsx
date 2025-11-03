// src/app/dashboard/upload/page.tsx
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
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { permissions } from '@/utils/permissions';
import { apiRequest } from '@/lib/api'; // 使用你已有的 apiRequest

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [assetData, setAssetData] = useState({
    name: '',
    description: '',
    tags: '',
    brand: '',
    assetNo: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // 支持的文件类型：图片(JPG, PNG), 3D模型(GLB), 视频(MP4)
    const validExtensions = ['jpg', 'jpeg', 'png', 'glb', 'mp4'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension && validExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      // 自动填充资产名称（使用文件名去掉扩展名）
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAssetData((prev) => ({
        ...prev,
        name: prev.name || fileNameWithoutExt,
      }));
      setMessage(null);
    } else {
      setMessage({
        type: 'error',
        text: 'Please upload supported file types: JPG, PNG, GLB (3D models), or MP4 (videos)',
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange =
    (field: keyof typeof assetData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setAssetData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  // 真正上传：FormData + apiRequest('/api/assets/', { method: 'POST', isFormData: true })
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
      // 与后端字段对齐（按你后端 AssetSerializer 的命名）
      fd.append('name', assetData.name);
      fd.append('file', selectedFile);

      // 资产类型：根据文件后缀简单判断（可再细化）
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const assetType =
        ['jpg', 'jpeg', 'png'].includes(ext) ? 'image' : ext === 'mp4' ? 'video' : 'document';
      fd.append('asset_type', assetType);

      if (assetData.description) fd.append('description', assetData.description);

      // 额外元数据（若你的后端有这些字段就传；没有也不会报错）
      if (assetData.brand) fd.append('brand', assetData.brand);
      if (assetData.assetNo) fd.append('asset_no', assetData.assetNo);

      // tags：后端若是 ManyToMany 的 id 列表，你可以在这里把逗号分隔的名字转 id。
      // 目前先把原始字符串传给后端可选字段（如果后端没有此字段可以删掉）
      if (assetData.tags) fd.append('tags_raw', assetData.tags);

      await apiRequest('/api/assets/', {
        method: 'POST',
        body: fd,
        isFormData: true, // 不要传 auth，避免 TS 报错
      });

      // 成功后的重置
      setSelectedFile(null);
      setAssetData({
        name: '',
        description: '',
        tags: '',
        brand: '',
        assetNo: '',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';

      setMessage({
        type: 'success',
        text: 'Asset uploaded successfully',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setAssetData({
      name: '',
      description: '',
      tags: '',
      brand: '',
      assetNo: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setMessage(null);
  };

  // 获取文件类型显示名称
  const getFileTypeDisplay = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'Image';
    if (ext === 'glb') return '3D Model';
    if (ext === 'mp4') return 'Video';
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
          <Text fontWeight="bold" mb={2}>
            Access Denied
          </Text>
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
            Supports: JPG, PNG (Images), GLB (3D Models), MP4 (Videos)
          </Text>
          {!selectedFile && <Button colorScheme="blue">Select Files</Button>}
        </VStack>

        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept=".jpg,.jpeg,.png,.glb,.mp4"
          display="none"
        />
      </Box>

      {/* 文件信息 + 表单 */}
      {selectedFile && (
        <VStack align="stretch" gap={4} p={6} borderWidth="1px" borderRadius="lg" bg="white">
          <Heading size="md">File Information</Heading>

          <Box>
            <Text fontWeight="medium" mb={2}>
              Selected File:
            </Text>
            <Text color="gray.600">{selectedFile.name}</Text>
            <Text fontSize="sm" color="gray.500">
              Type: {getFileTypeDisplay(selectedFile.name)} | Size:{' '}
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </Box>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="medium" mb={2}>
                Asset Name *
              </Text>
              <Input
                placeholder="Enter asset name"
                value={assetData.name}
                onChange={handleInputChange('name')}
              />
            </Box>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Asset Number
                </Text>
                <Input
                  placeholder="Enter asset number"
                  value={assetData.assetNo}
                  onChange={handleInputChange('assetNo')}
                />
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2}>
                  Brand
                </Text>
                <Input
                  placeholder="Enter brand"
                  value={assetData.brand}
                  onChange={handleInputChange('brand')}
                />
              </Box>
            </HStack>

            <Box>
              <Text fontWeight="medium" mb={2}>
                Description
              </Text>
              <Textarea
                placeholder="Describe this asset..."
                rows={4}
                value={assetData.description}
                onChange={handleInputChange('description')}
              />
            </Box>

            <Box>
              <Text fontWeight="medium" mb={2}>
                Tags
              </Text>
              <Input
                placeholder="Add tags (comma separated)"
                value={assetData.tags}
                onChange={handleInputChange('tags')}
              />
            </Box>

            <HStack gap={4} mt={4}>
              <Button
                colorScheme="blue"
                onClick={handleUpload}
                loading={uploading}          // Chakra v3 用 loading
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
