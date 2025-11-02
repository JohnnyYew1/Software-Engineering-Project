'use client';

import { Fragment } from 'react';
import { Box, Button, Text, Table } from '@chakra-ui/react';
import type { Asset } from '@/services/assets';

type Props = {
  assets: Asset[];
  onPreview: (asset: Asset) => void;
  onDownload: (asset: Asset) => void;
};

export default function AssetTable({ assets, onPreview, onDownload }: Props) {
  // 显示用 ID：优先 asset_no，没有就用 id（不动你全局类型）
  const displayId = (asset: Asset) => (asset as any).asset_no ?? asset.id;

  return (
    <Box border="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
      <Table.Root w="full">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Uploader</Table.ColumnHeader>
            <Table.ColumnHeader>Uploaded</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {assets.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={6}>
                <Text color="gray.500">No assets available</Text>
              </Table.Cell>
            </Table.Row>
          ) : (
            assets.map((asset) => (
              <Fragment key={asset.id}>
                <Table.Row _hover={{ bg: 'gray.50' }}>
                  <Table.Cell>
                    <Box>
                      <Text fontWeight="medium">{asset.name}</Text>
                      <Text fontSize="sm" color="gray.500" lineClamp={1}>
                        {asset.description || '—'}
                      </Text>
                    </Box>
                  </Table.Cell>

                  <Table.Cell textTransform="capitalize">
                    {asset.asset_type || '—'}
                  </Table.Cell>

                  <Table.Cell>{displayId(asset)}</Table.Cell>

                  <Table.Cell>{asset.uploaded_by?.username || '—'}</Table.Cell>

                  <Table.Cell>
                    {asset.upload_date
                      ? new Date(asset.upload_date).toLocaleDateString()
                      : '—'}
                  </Table.Cell>

                  <Table.Cell textAlign="right">
                    <Button
                      size="sm"
                      variant="outline"
                      mr={2}
                      onClick={() => onPreview(asset)}
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="green"
                      onClick={() => onDownload(asset)}
                    >
                      Download
                    </Button>
                  </Table.Cell>
                </Table.Row>
              </Fragment>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
