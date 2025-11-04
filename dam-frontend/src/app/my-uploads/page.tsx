"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Asset, Tag, getMyAssets, getTags, updateAsset,
} from "@/services/assets";
import { Box, Flex, Heading, Input, Textarea, Button, Text } from "@chakra-ui/react";

function NeonButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      color="white"
      borderRadius="md"
      bg="rgba(59,130,246,0.20)"
      _hover={{ bg: 'rgba(59,130,246,0.28)', transform: 'translateY(-1px)', boxShadow: '0 12px 28px rgba(59,130,246,0.25)' }}
      _active={{ bg: 'rgba(59,130,246,0.35)' }}
      position="relative"
      _before={{
        content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1px',
        background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor', maskComposite: 'exclude', pointerEvents: 'none',
      }}
      transition="all .15s ease"
    />
  );
}

export default function MyUploadsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Asset | null>(null);

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
      const [tagList, myAssets] = await Promise.all([getTags(), getMyAssets(Number(user.id), { ordering: "-created_at" })]);
      setTags(tagList);
      setAssets(myAssets || []);
      if (selected) {
        const refreshed = (myAssets || []).find((a) => a.id === selected.id);
        if (refreshed) applySelection(refreshed);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  function applySelection(a: Asset) {
    setSelected(a);
    setName(a.name || "");
    setDesc(a.description || "");
    setType((a.type as any) || "image");
    setSelectedTagIds((a.tags || []).map((t) => t.id));
    setSaveMsg(null);
  }
  function toggleTag(id: number) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  async function onSave() {
    if (!selected) return;
    setSaving(true); setSaveMsg(null);
    try {
      const payload = { name, description: desc, type, tag_ids: selectedTagIds };
      const updated = await updateAsset(selected.id, payload);
      setSaveMsg("Saved.");
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      applySelection(updated);
    } catch (e: any) {
      setSaveMsg(e?.response?.data ? JSON.stringify(e.response.data) : "Save failed.");
    } finally { setSaving(false); }
  }

  return (
    <Flex gap={6} p={6} direction={{ base: "column", md: "row" }}>
      {/* 左侧：列表（表格卡片） */}
      <Box flex="2">
        <Heading size="lg" mb={4} color="white">My Uploads</Heading>
        <Box bg="rgba(255,255,255,0.95)" borderRadius="20px" overflow="hidden"
             border="1px solid rgba(226,232,240,.9)" boxShadow="0 20px 60px rgba(0,0,0,.20)">
          <Box as="table" width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: '#0b0f2b', color: '#E2E8F0' }}>
                {['Name','Type','Tags','Created','Action'].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && assets.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "12px" }}>No uploads yet.</td></tr>
              )}
              {assets.map((a, idx) => (
                <tr key={a.id} style={{ borderTop: "1px solid #E2E8F0", background: idx % 2 ? 'white' : 'rgba(248,250,252,.7)' }}>
                  <td style={{ padding: "12px" }}>{a.name}</td>
                  <td style={{ padding: "12px" }}>{a.type}</td>
                  <td style={{ padding: "12px" }}>{(a.tags || []).map(t => t.name).join(", ")}</td>
                  <td style={{ padding: "12px" }}>{a.created_at?.slice(0, 10) || a.upload_date?.slice(0,10) || "-"}</td>
                  <td style={{ padding: "12px" }}>
                    <NeonButton size="sm" onClick={() => applySelection(a)} disabled={loading}>
                      {selected?.id === a.id ? "Editing..." : "Edit"}
                    </NeonButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      </Box>

      {/* 右侧：编辑卡片 */}
      <Box flex="1" minW={{ md: "360px" }}>
        <Heading size="md" mb={4} color="white">Edit Details</Heading>
        {!selected && (
          <Box p={4} border="1px dashed rgba(148,163,184,.4)" borderRadius="20px" color="gray.300" bg="rgba(255,255,255,0.05)">
            Select one of your assets on the left to edit.
          </Box>
        )}

        {selected && (
          <Box p={6} border="1px solid rgba(148,163,184,.25)" borderRadius="20px"
               bg="rgba(255,255,255,0.95)" boxShadow="0 20px 60px rgba(0,0,0,.20)">
            <Box mb={3} fontSize="sm" color="gray.600">
              ID #{selected.id} • Uploaded by {selected.uploaded_by?.username ?? "-"} • {(selected.created_at ?? selected.upload_date ?? "").toString().slice(0,10) || "-"}
            </Box>

            <Box mb={3}>
              <Box mb={1} fontWeight="medium">Name</Box>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Box>

            <Box mb={3}>
              <Box mb={1} fontWeight="medium">Description</Box>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
            </Box>

            <Box mb={3}>
              <Box mb={1} fontWeight="medium">Type</Box>
              <select value={type} onChange={(e) => setType(e.target.value as any)}
                style={{ width: "100%", padding: "8px", background: "transparent",
                         border: "1px solid #CBD5E1", borderRadius: "8px" }}>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="3d_model">3d_model</option>
                <option value="document">document</option>
              </select>
            </Box>

            <Box mb={2} fontWeight="medium">Tags</Box>
            <Box border="1px solid #CBD5E1" borderRadius="md" p={2} maxH="160px" overflow="auto" mb={4}>
              {tags.map((t) => (
                <label key={t.id} style={{ display: "block", padding: "4px 2px", color: "#334155" }}>
                  <input type="checkbox" checked={selectedTagIds.includes(t.id)} onChange={() => toggleTag(t.id)} style={{ marginRight: 8 }} />
                  {t.name}
                </label>
              ))}
            </Box>

            <Flex gap={3}>
              <NeonButton onClick={onSave} disabled={saving} loading={saving} loadingText="Saving...">Save</NeonButton>
              <Button variant="outline" onClick={() => selected && applySelection(selected)} disabled={saving}>Reset</Button>
            </Flex>

            {saveMsg && <Text mt={3} fontSize="sm" color="gray.600">{saveMsg}</Text>}
            {!canEdit && <Box mt={4} color="orange.500" fontSize="sm">You don't have permission to edit.</Box>}
          </Box>
        )}
      </Box>
    </Flex>
  );
}
