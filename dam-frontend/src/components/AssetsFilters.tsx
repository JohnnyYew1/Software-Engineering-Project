// src/components/AssetsFilters.tsx
'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
} from '@chakra-ui/react';

export type AssetsFilters = {
  search?: string;
  asset_type?: string;      // 'image' | 'video' | 'pdf' | 'document' | ''
  ordering?: string;        // '-upload_date' | 'upload_date' | 'name' | ''
  tags?: number[];          // tag id 数组
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
    });

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
            </select>
          </Box>

          <Box minW="220px">
            <Text fontSize="sm" mb={1} color="gray.600">Ordering</Text>
            {/* 原生 select，避免 Chakra v3 类型坑 */}
            <select
              value={filters.ordering ?? '-upload_date'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                set({ ordering: e.target.value })
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
      </VStack>
    </Box>
  );
}
