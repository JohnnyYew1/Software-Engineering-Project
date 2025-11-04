"use client";
import VersionHistory from "@/components/VersionHistory";
import { useEffect, useMemo, useState, useRef } from "react";
import { Box, Button, Flex, Input, Text, Badge } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AssetItem,
  AssetVersion,
  getAssetById,
  getPreviewUrl,
  getAssetVersions,
  uploadNewVersion,
  restoreVersion,
  downloadAsset, // 用于拉取 PDF blob
  saveBlob,      // 保留你已有的下载辅助
} from "@/services/assets";
import { authService } from "@/services/auth";
import { BASE_URL } from "@/lib/api";

// 3D 预览
const ThreeDPreview = dynamic(() => import("@/components/ThreeDPreview"), { ssr: false });

function ensureAbsolute(u?: string): string {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}
function inferKind(url?: string, type?: string, mime?: string) {
  const u = (url || "").toLowerCase();
  const t = (type || "").toLowerCase();
  const m = (mime || "").toLowerCase();

  // 先用 mime_type（解决无后缀）
  if (m.includes("pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.includes("gltf") || m.includes("glb")) return "3d";

  // 再用 asset_type
  if (t.includes("pdf")) return "pdf";
  if (t.includes("image")) return "image";
  if (t.includes("video")) return "video";
  if (t.includes("3d")) return "3d";

  // 最后用 URL 后缀
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(u)) return "image";
  if (/\.(mp4|webm|ogg)(\?|$)/.test(u)) return "video";
  if (/\.pdf(\?|$)/.test(u)) return "pdf";
  if (/\.(gltf|glb|obj|mtl)(\?|$)/.test(u)) return "3d";

  return "other";
}
function ext(url?: string): string {
  const u = (url || "").split("?")[0];
  const m = u.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] ?? "").toLowerCase();
}
type TabKey = "history" | "upload";

export default function PreviewPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const idParam = sp.get("id");
  const assetId = idParam ? Number(idParam) : NaN;

  const me = authService.getCurrentUser();
  const myRole = (me?.role ?? "viewer").toLowerCase() as "admin" | "editor" | "viewer";
  const canWrite = myRole === "admin" || myRole === "editor";

  const [asset, setAsset] = useState<AssetItem | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [versionsNote, setVersionsNote] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [fatalPreviewErr, setFatalPreviewErr] = useState<string>("");

  // ✅ 新增：PDF 的 blob: URL（避免 X-Frame-Options 阻挡）
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const oldPdfBlobUrl = useRef<string>("");

  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    (async () => {
      const a = await getAssetById(assetId);
      setAsset(a);
    })();
  }, [assetId]);

  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    (async () => {
      setLoadingPreview(true);
      setFatalPreviewErr("");
      try {
        let url = "";
        try {
          const u = await getPreviewUrl(assetId);
          url = ensureAbsolute(u);
        } catch {
          const a = await getAssetById(assetId);
          url = ensureAbsolute(a?.file_url);
        }
        if (url) setFileUrl(url);
        else {
          setFileUrl("");
          setFatalPreviewErr("No preview available for this asset.");
        }
      } catch {
        setFileUrl("");
        setFatalPreviewErr("Failed to load preview.");
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [assetId]);

  async function refreshVersions() {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setLoadingList(true);
      setVersionsNote("");
      const list = await getAssetVersions(assetId);
      setVersions(list);
    } catch (e: any) {
      setVersions([]);
      setVersionsNote(
        typeof e?.message === "string" && e.message
          ? `Version list unavailable: ${e.message}`
          : "Version list unavailable."
      );
    } finally {
      setLoadingList(false);
    }
  }
  useEffect(() => {
    refreshVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const kind = useMemo(
    () => inferKind(fileUrl, asset?.type ?? asset?.asset_type, asset?.mime_type),
    [fileUrl, asset]
  );
  const extname = useMemo(() => ext(fileUrl), [fileUrl]);

  // ✅ 新增：当识别为 PDF 时，先用下载接口拿 blob，再生成 blob: URL 给 iframe 使用
  useEffect(() => {
    let revoked = false;

    async function preparePdfBlob() {
      if (!assetId || Number.isNaN(assetId)) return;
      if (kind !== "pdf") {
        // 清理之前的 blob
        if (oldPdfBlobUrl.current) {
          URL.revokeObjectURL(oldPdfBlobUrl.current);
          oldPdfBlobUrl.current = "";
        }
        setPdfBlobUrl("");
        return;
      }
      try {
        const blob = await downloadAsset(assetId); // 已带 JWT 的后端下载接口
        const url = URL.createObjectURL(blob);
        // 清理旧的
        if (oldPdfBlobUrl.current) {
          URL.revokeObjectURL(oldPdfBlobUrl.current);
        }
        oldPdfBlobUrl.current = url;
        if (!revoked) setPdfBlobUrl(url);
      } catch {
        // 留空：UI 会显示“Open in new tab / Download”按钮
        if (!revoked) setPdfBlobUrl("");
      }
    }

    preparePdfBlob();

    return () => {
      revoked = true;
      if (oldPdfBlobUrl.current) {
        URL.revokeObjectURL(oldPdfBlobUrl.current);
        oldPdfBlobUrl.current = "";
      }
    };
  }, [assetId, kind]);

  async function onDownloadCurrent() {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setDownloading(true);
      const blob = await downloadAsset(assetId);
      const filename =
        (asset?.name && asset.name.trim()) ||
        (fileUrl && fileUrl.split("/").pop()) ||
        `download${extname ? "." + extname : ""}`;
      saveBlob(blob, filename);
    } finally {
      setDownloading(false);
    }
  }

  async function onUploadNewVersion() {
    if (!assetId || Number.isNaN(assetId) || !file) return;
    try {
      setUploading(true);
      await uploadNewVersion(assetId, file, note || undefined);
      setFile(null);
      setNote("");
      await Promise.all([
        refreshVersions(),
        (async () => {
          try {
            const u = await getPreviewUrl(assetId);
            const url = ensureAbsolute(u);
            if (url) {
              setFileUrl(url);
              setFatalPreviewErr("");
            } else {
              const a = await getAssetById(assetId);
              const f = ensureAbsolute(a?.file_url);
              setFileUrl(f);
              if (!f) setFatalPreviewErr("No preview available after upload.");
            }
          } catch {
            setFileUrl("");
            setFatalPreviewErr("Failed to refresh preview after upload.");
          }
        })(),
      ]);
      setActiveTab("history");
    } finally {
      setUploading(false);
    }
  }

  async function onRestore(v: AssetVersion) {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setRestoringId(v.version);
      await restoreVersion(assetId, v.version);
      await Promise.all([
        refreshVersions(),
        (async () => {
          try {
            const u = await getPreviewUrl(assetId);
            const url = ensureAbsolute(u);
            if (url) {
              setFileUrl(url);
              setFatalPreviewErr("");
            } else {
              const a = await getAssetById(assetId);
              const f = ensureAbsolute(a?.file_url);
              setFileUrl(f);
              if (!f) setFatalPreviewErr("No preview available after restore.");
            }
          } catch {
            setFileUrl("");
            setFatalPreviewErr("Failed to refresh preview after restore.");
          }
        })(),
      ]);
    } finally {
      setRestoringId(null);
    }
  }

  function openPdfNewTab() {
    // 优先用 blob: URL（能跨源预览）；其次退回原始 URL
    const u = pdfBlobUrl || fileUrl;
    if (!u) return;
    window.open(u, "_blank", "noopener,noreferrer");
  }
  async function downloadPdf() {
    if (!assetId || Number.isNaN(assetId)) return;
    await onDownloadCurrent();
  }

  return (
    <Box p="24px">
      <Flex align="center" gap="12px" mb="16px">
        <Button onClick={() => router.back()} variant="outline">← Back</Button>
        <Text fontSize="20px" fontWeight="bold">Asset Preview</Text>
        <div style={{ flex: 1 }} />
        <Button onClick={onDownloadCurrent} disabled={downloading || !assetId}>
          {downloading ? "Downloading..." : "Download Current"}
        </Button>
      </Flex>

      {fatalPreviewErr && !fileUrl && (
        <Box mt="12px" p="12px" bg="red.600" color="white" borderRadius="8px" fontSize="14px">
          {fatalPreviewErr}
        </Box>
      )}

      <Box border="1px solid #4A5568" borderRadius="8px" p="16px" mb="24px">
        <Flex align="flex-start" gap="16px" wrap="wrap">
          <Box minW="280px">
            <Text><b>Name:</b> {asset?.name ?? "-"}</Text>
            <Text><b>Brand:</b> {asset?.brand ?? "-"}</Text>
            <Text><b>Asset No:</b> {asset?.asset_no ?? "-"}</Text>
            <Text>
              <b>Type:</b>{" "}
              <Badge colorScheme="purple">{asset?.type ?? asset?.asset_type ?? "-"}</Badge>
            </Text>
            <Text><b>Uploaded:</b> {asset?.upload_date ?? "-"}</Text>
            <Text><b>Downloads:</b> {asset?.download_count ?? 0}</Text>
            <Text><b>Views:</b> {asset?.view_count ?? 0}</Text>
            <Box mt="8px">
              <Text mb="6px"><b>Tags:</b></Text>
              <Flex wrap="wrap" gap="6px">
                {asset?.tags?.length
                  ? asset.tags.map((t) => <Badge key={t.id} variant="outline">{t.name}</Badge>)
                  : <Text color="gray.400">None</Text>}
              </Flex>
            </Box>
          </Box>

          <Box flex="1" minWidth="300px" minHeight="420px" border="1px dashed #4A5568" p="12px" borderRadius="8px">
            {loadingPreview && <Box color="gray.300">Loading preview…</Box>}

            {!loadingPreview && fileUrl && kind === "image" && (
              <img src={fileUrl} alt={asset?.name || "image"} style={{ maxHeight: 560, maxWidth: "100%" }} />
            )}

            {!loadingPreview && fileUrl && kind === "video" && (
              <video src={fileUrl} controls style={{ maxHeight: 560, width: "100%" }} />
            )}

            {/* ✅ 核心改动：优先用 blob: URL 在 iframe 内嵌，避免 refused to connect */}
            {!loadingPreview && kind === "pdf" && (
              <Box>
                <Flex gap="8px" mb="8px">
                  <Button onClick={openPdfNewTab}>Open in new tab</Button>
                  <Button variant="outline" onClick={downloadPdf}>Download PDF</Button>
                </Flex>

                {pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} style={{ width: "100%", height: 560, border: "none" }} />
                ) : (
                  <Box color="gray.400">
                  Unable to embed PDF inline (fetch failed or blocked). You can still{" "}
                  <Button
                    variant="plain"            // ✅ v3 支持：plain / ghost / solid / outline / subtle / surface
                    onClick={openPdfNewTab}
                    p={0} h="auto" minW="unset"   // 让按钮看起来像链接
                  >
                    <Text as="span" textDecor="underline">open it in a new tab</Text>
                  </Button>{" "}
                  or use the download button above.
                </Box>
                )}
              </Box>
            )}

            {!loadingPreview && fileUrl && kind === "3d" && (ext(fileUrl) === "glb" || ext(fileUrl) === "gltf") && (
              <div style={{ height: 560, width: "100%" }}>
                <ThreeDPreview fileUrl={fileUrl} />
              </div>
            )}

            {!loadingPreview && !fileUrl && (
              <Box color="gray.400">No preview available.</Box>
            )}
          </Box>
        </Flex>
      </Box>

      <Flex gap="8px" mb="12px">
        <Button
          variant={activeTab === "history" ? "solid" : "outline"}
          onClick={() => setActiveTab("history")}
        >Version History</Button>
        {canWrite && (
          <Button
            variant={activeTab === "upload" ? "solid" : "outline"}
            onClick={() => setActiveTab("upload")}
          >Upload New Version</Button>
        )}
      </Flex>

      {activeTab === "history" && (
        <Box>
          <Flex align="center" gap="12px" mb="10px">
            <Button onClick={refreshVersions} disabled={loadingList}>
              {loadingList ? "Refreshing..." : "Refresh"}
            </Button>
            <Text color="gray.400" fontSize="14px">最新在最上面</Text>
            {versionsNote && <Text color="gray.400" fontSize="14px">（{versionsNote}）</Text>}
          </Flex>

          <Box border="1px solid #2D3748" borderRadius="8px" overflow="hidden">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead style={{ background: "#1A202C", color: "#E2E8F0" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px" }}>#</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>Uploaded At</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>By</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>Note</th>
                  <th style={{ textAlign: "left", padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "10px", color: "#A0AEC0" }}>No versions yet.</td>
                  </tr>
                )}
                {versions.map((v) => (
                  <tr key={v.id} style={{ borderTop: "1px solid #2D3748" }}>
                    <td style={{ padding: "10px" }}>v{v.version}</td>
                    <td style={{ padding: "10px" }}>{v.created_at}</td>
                    <td style={{ padding: "10px" }}>{v.uploaded_by?.username ?? "-"}</td>
                    <td style={{ padding: "10px" }}>{v.note ?? "-"}</td>
                    <td style={{ padding: "10px" }}>
                      <Flex gap="8px">
                        {v.file_url ? (
                          <a href={ensureAbsolute(v.file_url)} download target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">Download</Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" disabled>No URL</Button>
                        )}
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="solid"
                            onClick={() => onRestore(v)}
                            disabled={restoringId === v.version}
                          >
                            {restoringId === v.version ? "Restoring…" : "Restore"}
                          </Button>
                        )}
                      </Flex>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      )}

      {activeTab === "upload" && canWrite && (
        <Box border="1px solid #2D3748" borderRadius="8px" p="16px" maxW="560px">
          <Box mb="12px">
            <Text mb="6px">Select file</Text>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Box>
          <Box mb="12px">
            <Text mb="6px">Note (optional)</Text>
            <Input placeholder="e.g. fix color correction" value={note} onChange={(e) => setNote(e.target.value)} />
          </Box>
          <Flex gap="8px">
            <Button onClick={onUploadNewVersion} disabled={!file || uploading}>
              {uploading ? "Uploading…" : "Upload New Version"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setFile(null); setNote(""); }}
              disabled={uploading}
            >
              Clear
            </Button>
          </Flex>
          <Text mt="8px" fontSize="sm" color="gray.400">提交后，当前预览将自动指向新版本。</Text>
        </Box>
      )}
    </Box>
  );
}
