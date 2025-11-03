// src/app/my-uploads/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Asset,
  Tag,
  getMyAssets,
  getTags,
  updateAsset,
} from "@/services/assets";
import { Box, Flex, Heading, Input, Textarea, Button } from "@chakra-ui/react";

export default function MyUploadsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);

  // 编辑表单状态
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<Asset["type"]>("image");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return role === "editor" || role === "admin";
  }, [user]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [tagList, myAssets] = await Promise.all([
        getTags(),
        getMyAssets(Number(user.id), { ordering: "-created_at" }),
      ]);
      setTags(tagList);
      setAssets(myAssets || []);
      if (selected) {
        const refreshed = (myAssets || []).find((a) => a.id === selected.id);
        if (refreshed) applySelection(refreshed);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function applySelection(a: Asset) {
    setSelected(a);
    setName(a.name || "");
    setDesc(a.description || "");
    setType((a.type as any) || "image");
    setSelectedTagIds((a.tags || []).map((t) => t.id));
    setSaveMsg(null);
  }

  function toggleTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSave() {
    if (!selected) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        name,
        description: desc,
        type,
        tag_ids: selectedTagIds,
      };
      const updated = await updateAsset(selected.id, payload);
      setSaveMsg("Saved.");
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      applySelection(updated);
    } catch (e: any) {
      setSaveMsg(e?.response?.data ? JSON.stringify(e.response.data) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex gap={6} p={6} direction={{ base: "column", md: "row" }}>
      <Box flex="2">
        <Heading size="lg" mb={4}>My Uploads</Heading>
        <Box border="1px solid #2d3748" borderRadius="lg" overflow="hidden">
          <Box as="table" width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #2d3748" }}>Name</th>
                <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #2d3748" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #2d3748" }}>Tags</th>
                <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #2d3748" }}>Created</th>
                <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #2d3748" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "12px" }}>No uploads yet.</td>
                </tr>
              )}
              {assets.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #2d3748" }}>
                  <td style={{ padding: "10px" }}>{a.name}</td>
                  <td style={{ padding: "10px" }}>{a.type}</td>
                  <td style={{ padding: "10px" }}>
                    {(a.tags || []).map(t => t.name).join(", ")}
                  </td>
                  <td style={{ padding: "10px" }}>{a.created_at?.slice(0, 10) || a.upload_date?.slice(0,10) || "-"}</td>
                  <td style={{ padding: "10px" }}>
                    <Button size="sm" onClick={() => applySelection(a)} disabled={loading}>
                      {selected?.id === a.id ? "Editing..." : "Edit"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      </Box>

      <Box flex="1" minW={{ md: "360px" }}>
        <Heading size="md" mb={4}>Edit Details</Heading>
        {!selected && (
          <Box p={4} border="1px dashed #4a5568" borderRadius="lg">
            Select one of your assets on the left to edit.
          </Box>
        )}
        {selected && (
          <Box p={4} border="1px solid #2d3748" borderRadius="lg">
            <Box mb={3} fontSize="sm" color="gray.400">
              ID #{selected.id} • Uploaded by {selected.uploaded_by?.username ?? "-"} • {(selected.created_at ?? selected.upload_date ?? "").toString().slice(0,10) || "-"}
            </Box>

            <Box mb={3}>
              <Box mb={1}>Name</Box>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Box>

            <Box mb={3}>
              <Box mb={1}>Description</Box>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
            </Box>

            <Box mb={3}>
              <Box mb={1}>Type</Box>
              {/* 原生 select，避免 Chakra Select 的类型问题 */}
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "transparent",
                  border: "1px solid #2d3748",
                  borderRadius: "8px",
                }}
              >
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="3d_model">3d_model</option>
                <option value="document">document</option>
              </select>
            </Box>

            <Box mb={2}>Tags</Box>
            <Box
              border="1px solid #2d3748"
              borderRadius="md"
              p={2}
              maxH="160px"
              overflow="auto"
              mb={4}
            >
              {tags.map((t) => (
                <label key={t.id} style={{ display: "block", padding: "4px 2px" }}>
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                    style={{ marginRight: 8 }}
                  />
                  {t.name}
                </label>
              ))}
            </Box>

            <Flex gap={3}>
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => selected && applySelection(selected)}
                disabled={saving}
              >
                Reset
              </Button>
            </Flex>

            {saveMsg && (
              <Box mt={3} fontSize="sm" color="gray.300">{saveMsg}</Box>
            )}

            {!canEdit && (
              <Box mt={4} color="orange.300" fontSize="sm">
                You don't have permission to edit.
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
}
