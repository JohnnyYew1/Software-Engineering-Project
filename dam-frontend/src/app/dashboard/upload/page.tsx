/* FULL FILE: src/app/dashboard/upload/page.tsx */
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

  const [assetData, setAssetData] = useState({ name: '', description: '', brand: '', assetNo: '' });

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [stagedTagIds, setStagedTagIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    (async () => {
      try {
        const tags = await listTags();
        setAllTags(tags || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
        setStagedTagIds(selectedTagIds);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [tagDropdownOpen, selectedTagIds]);

  const openTagDropdown = () => {
    setStagedTagIds(selectedTagIds);
    setTagDropdownOpen(true);
  };
  const toggleStage = (id: number) => {
    setStagedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    const validExtensions = ['jpg', 'jpeg', 'png', 'glb', 'mp4', 'pdf'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && validExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setAssetData((prev) => ({ ...prev, name: prev.name || fileNameWithoutExt }));
      setMessage(null);
    } else {
      setSelectedFile(null);
      setMessage({
        type: 'error',
        text:
          'Please upload supported file types: JPG, PNG (images), GLB (3D), MP4 (videos), or PDF (documents)',
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  const handleInputChange =
    (field: keyof typeof assetData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setAssetData((prev) => ({ ...prev, [field]: e.target.value }));

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

      selectedTagIds.forEach((id) => fd.append('tag_ids', String(id)));

      await apiRequest('/api/assets/', { method: 'POST', body: fd, isFormData: true });

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

  if (!permissions.canUpload()) {
    return (
      <VStack align="stretch" gap={6}>
        <Heading color="white">Upload Asset</Heading>
        <Box
          bg="rgba(255,255,255,0.70)"
          color="gray.900"
          p={4}
          borderRadius="md"
          border="1px solid rgba(255,255,255,0.35)"
          boxShadow="0 10px 30px rgba(0,0,0,0.18)"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <Text fontWeight="bold" mb={2}>
            Access Denied
          </Text>
          <Text>Only Editor role can upload assets. Redirecting…</Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Heading color="white">Upload Asset</Heading>

      {message && (
        <Box
          bg="rgba(255,255,255,0.70)"
          color={message.type === 'error' ? 'red.800' : 'green.800'}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={message.type === 'error' ? 'rgba(252,165,165,0.90)' : 'rgba(187,247,208,0.90)'}
          boxShadow="0 10px 30px rgba(0,0,0,0.18)"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {message.text}
        </Box>
      )}

      {/* DnD 卡片：半透明 70% */}
      <Box
        bg="rgba(255,255,255,0.70)"
        border="1px solid rgba(226,232,240,0.90)"
        borderRadius="20px"
        boxShadow="0 20px 60px rgba(0,0,0,0.20)"
        p={8}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <Box
          border="2px dashed"
          borderColor={dragOver ? 'blue.300' : 'rgba(203,213,225,0.9)'}
          borderRadius="16px"
          p={8}
          textAlign="center"
          bg={dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.85)'}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          cursor="pointer"
          transition="all 0.2s"
          onClick={() => fileInputRef.current?.click()}
        >
          <VStack gap={4}>
            <Text fontSize="xl" fontWeight="bold" color="gray.900">
              {selectedFile ? 'File Selected' : 'Drag & Drop Files Here'}
            </Text>
            <Text color="gray.700">
              {selectedFile ? selectedFile.name : 'or click to select files from your computer'}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Supports: JPG, PNG (Images), GLB (3D Models), MP4 (Videos), PDF (Documents)
            </Text>
            {!selectedFile && (
              <Button
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
                color="white"
                bg="linear-gradient(90deg,#3b82f6,#8b5cf6)"
              >
                Select Files
              </Button>
            )}
          </VStack>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".jpg,.jpeg,.png,.glb,.mp4,.pdf"
            display="none"
          />
        </Box>
      </Box>

      {/* 文件信息 + 表单 卡片：半透明 60% */}
      {selectedFile && (
        <VStack
          align="stretch"
          gap={4}
          bg="rgba(255,255,255,0.60)"
          border="1px solid rgba(226,232,240,0.90)"
          borderRadius="20px"
          boxShadow="0 20px 60px rgba(0,0,0,0.20)"
          p={6}
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <Heading size="md" color="gray.900">
            File Information
          </Heading>

          <Box>
            <Text fontWeight="medium" mb={1} color="gray.900">
              Selected File:
            </Text>
            <Text color="gray.800">{selectedFile.name}</Text>
            <Text fontSize="sm" color="gray.600">
              Type: {getFileTypeDisplay(selectedFile.name)} | Size:{' '}
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Text>
          </Box>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontWeight="medium" mb={2} color="gray.900">
                Asset Name *
              </Text>
              <Input placeholder="Enter asset name" value={assetData.name} onChange={handleInputChange('name')} bg="white" />
            </Box>

            <HStack gap={4}>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2} color="gray.900">
                  Asset Number
                </Text>
                <Input placeholder="Enter asset number" value={assetData.assetNo} onChange={handleInputChange('assetNo')} bg="white" />
              </Box>
              <Box flex={1}>
                <Text fontWeight="medium" mb={2} color="gray.900">
                  Brand
                </Text>
                <Input placeholder="Enter brand" value={assetData.brand} onChange={handleInputChange('brand')} bg="white" />
              </Box>
            </HStack>

            <Box>
              <Text fontWeight="medium" mb={2} color="gray.900">
                Description
              </Text>
              <Textarea placeholder="Describe this asset..." rows={4} value={assetData.description} onChange={handleInputChange('description')} bg="white" />
            </Box>

            {/* 标签多选（弹出层） */}
            <Box position="relative" ref={dropdownRef as any}>
              <Text fontWeight="medium" mb={2} color="gray.900">
                Tags
              </Text>
              <Button
                variant="outline"
                onClick={() => openTagDropdown()}
                style={{ justifyContent: 'space-between', width: '100%' }}
                borderColor="rgba(226,232,240,0.90)"
                bg="rgba(255,255,255,0.85)"
              >
                <HStack justify="space-between" width="100%">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedTagNames}>
                    {selectedTagNames}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>▾</span>
                </HStack>
              </Button>

              {tagDropdownOpen && (
                <Box
                  position="absolute"
                  zIndex={20}
                  bg="rgba(255,255,255,0.70)"
                  border="1px solid rgba(226,232,240,0.90)"
                  borderRadius="16px"
                  mt={2}
                  w="100%"
                  boxShadow="0 20px 60px rgba(0,0,0,0.20)"
                  p={2}
                  style={{ backdropFilter: 'blur(10px)' }}
                >
                  <Box maxHeight="220px" overflowY="auto" style={{ padding: '6px 4px' }}>
                    {allTags.length === 0 && (
                      <Text fontSize="sm" color="gray.600" p={2}>
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
                            borderRadius: 8,
                            background: checked ? '#F7FAFC' : 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleStage(t.id)} />
                          <span style={{ fontSize: 14 }}>{t.name}</span>
                        </label>
                      );
                    })}
                  </Box>
                  <HStack justify="flex-end" gap={2} p={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTagDropdownOpen(false);
                        setStagedTagIds(selectedTagIds);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" colorScheme="blue" onClick={applyTags}>
                      Done
                    </Button>
                  </HStack>
                </Box>
              )}

              {selectedTagIds.length > 0 && (
                <Text mt={2} fontSize="sm" color="gray.700">
                  Selected: {selectedTagNames}
                </Text>
              )}
              {selectedTagIds.length === 0 && (
                <Text mt={2} fontSize="sm" color="gray.600">
                  * Tags are managed by Admin. Editors can only select existing tags.
                </Text>
              )}
            </Box>

            <HStack gap={4} mt={4}>
              <Button
                onClick={handleUpload}
                disabled={uploading}
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
                color="white"
                bg="linear-gradient(90deg,#3b82f6,#8b5cf6)"
                _hover={{ transform: 'translateY(-1px)' }}
                transition="all .15s ease"
              >
                {uploading ? 'Uploading…' : 'Upload Asset'}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={uploading}>
                Clear
              </Button>
            </HStack>
          </VStack>
        </VStack>
      )}
    </VStack>
  );
}
