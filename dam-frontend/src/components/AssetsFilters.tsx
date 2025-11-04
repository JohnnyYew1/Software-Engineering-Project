// src/components/AssetsFilters.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
} from '@chakra-ui/react';
import { authService } from '@/services/auth';

export type AssetsFilters = {
  search?: string;
  asset_type?: string;      // 'image' | 'video' | 'pdf' | 'document' | ''
  ordering?: string;        // '-upload_date' | 'upload_date' | 'name' | '-name' | ...
  tags?: number[];          // tag id 数组
  /** ★ 新增：仅看我上传的（由外部接收并传给后端的 query：uploaded_by=<currentUser.id>） */
  uploaded_by?: number | string;
};

export interface TagOption {
  id: number;
  name: string;
}

interface AssetsFiltersProps {
  value: AssetsFilters;
  onChange: (next: AssetsFilters) => void;
  tagOptions?: TagOption[];     // 可选标签列表
  isLoading?: boolean;          // 可选：外部 loading
}

const ORDERING_MY_UPLOADS = '__my_uploads__';

export default function AssetsFilters({
  value,
  onChange,
  tagOptions = [],
  isLoading = false,
}: AssetsFiltersProps) {
  const filters = value || {};
  const set = (patch: Partial<AssetsFilters>) => onChange({ ...filters, ...patch });

  const toggleTag = (tagId: number) => {
    const cur = new Set<number>(filters.tags || []);
    if (cur.has(tagId)) cur.delete(tagId);
    else cur.add(tagId);
    set({ tags: Array.from(cur) });
  };

  const resetAll = () =>
    onChange({
      search: '',
      asset_type: '',
      ordering: '-upload_date',
      tags: [],
      uploaded_by: undefined,
    });

  // 读取当前登录用户（用于 My uploads）
  const currentUser = useMemo(() => {
    try { return authService.getCurrentUser?.() ?? null; } catch { return null; }
  }, []);

  // 当前是否处于“只看我上传”的模式（由 uploaded_by 是否等于 currentUser.id 判断）
  const myOnly = useMemo(() => {
    if (!currentUser?.id) return false;
    return String(filters.uploaded_by ?? '') === String(currentUser.id);
  }, [filters.uploaded_by, currentUser?.id]);

  // 统一处理 Ordering 选择变化
  const onOrderingChange = (v: string) => {
    if (v === ORDERING_MY_UPLOADS) {
      // 选中 “My uploads”
      if (currentUser?.id) {
        // ordering 仍然用一个有效字段（默认用 -upload_date）
        set({
          ordering: filters.ordering || '-upload_date',
          uploaded_by: currentUser.id,
        });
      } else {
        // 没有登录用户时，忽略为普通排序（防呆）
        set({ ordering: '-upload_date', uploaded_by: undefined });
      }
    } else {
      // 选中常规排序项：如果之前在 myOnly 模式，清掉 uploaded_by
      const patch: Partial<AssetsFilters> = { ordering: v };
      if (myOnly) patch.uploaded_by = undefined;
      set(patch);
    }
  };

  // 下拉显示值：在 myOnly 时，强制显示到 My uploads
  const orderingSelectValue = myOnly ? ORDERING_MY_UPLOADS : (filters.ordering ?? '-upload_date');

  return (
    <Box
      border="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      bg="white"
    >
      <VStack align="stretch" gap={4}>
        {/* 第一行：搜索 + 类型 + 排序 */}
        <HStack align="flex-end" gap={4} flexWrap="wrap">
          <Box flex={1} minW="220px">
            <Text fontSize="sm" mb={1} color="gray.600">Search</Text>
            <Input
              placeholder="Search by name/description/tag"
              value={filters.search ?? ''}
              onChange={(e) => set({ search: e.target.value })}
            />
          </Box>

          <Box minW="200px">
            <Text fontSize="sm" mb={1} color="gray.600">Type</Text>
            {/* 原生 select，避免 Chakra v3 类型坑 */}
            <select
              value={filters.asset_type ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                set({ asset_type: e.target.value })
              }
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
              <option value="3d_model">3D Model</option>
            </select>
          </Box>

          <Box minW="240px">
            <Text fontSize="sm" mb={1} color="gray.600">Ordering</Text>
            {/* 原生 select，避免 Chakra v3 类型坑 */}
            <select
              value={orderingSelectValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onOrderingChange(e.target.value)
              }
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
              <option value="-name">Name Z→A</option>
              <option value="-view_count">Most viewed</option>
              <option value="-download_count">Most downloaded</option>
              {/* ★ 新增：我的上传（筛选开关） */}
              <option value={ORDERING_MY_UPLOADS}>My uploads</option>
            </select>
          </Box>

          <Button
            onClick={resetAll}
            variant="outline"
            disabled={isLoading}
          >
            Reset
          </Button>
        </HStack>

        {/* 第二行：标签多选 */}
        {tagOptions.length > 0 && (
          <Box>
            <Text fontSize="sm" mb={2} color="gray.600">Tags</Text>
            <HStack gap={4} flexWrap="wrap">
              {tagOptions.map((t) => {
                const checked = !!(filters.tags || []).includes(t.id);
                return (
                  <label
                    key={t.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: '1px solid #E2E8F0',
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: checked ? '#EDF2F7' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {/* 原生 checkbox，避免 Chakra v3 类型坑 */}
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTag(t.id)}
                    />
                    <span style={{ fontSize: 14 }}>{t.name}</span>
                  </label>
                );
              })}
            </HStack>
          </Box>
        )}

        {/* 处于 My uploads 时给个提示与清除按钮 */}
        {myOnly && (
          <HStack>
            <Text fontSize="sm" color="green.600">
              Showing <b>my uploads</b>
              {currentUser?.username ? ` (@${currentUser.username})` : ''} only
            </Text>
            <Button
              size="xs"
              variant="outline"
              onClick={() => set({ uploaded_by: undefined })}
            >
              Clear
            </Button>
          </HStack>
        )}
      </VStack>
    </Box>
  );
}
