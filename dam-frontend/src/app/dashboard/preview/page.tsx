"use client";

import { useEffect, useMemo, useState } from "react";
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
  downloadAsset,
} from "@/services/assets";
import { authService } from "@/services/auth";
import { BASE_URL } from "@/lib/api";

// 动态加载 3D 预览，避免 SSR 报错
const ThreeDPreview = dynamic(() => import("@/components/ThreeDPreview"), { ssr: false });

/** 统一绝对 URL（后端有时是绝对，有时是相对） */
function ensureAbsolute(u?: string): string {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${BASE_URL}${u}`;
  return `${BASE_URL}/${u}`;
}

/** 简单判断类型，避免依赖后端 mime */
function inferKind(url?: string, type?: string) {
  const u = (url || "").toLowerCase();
  const t = (type || "").toLowerCase();
  if (t.includes("image") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(u)) return "image";
  if (t.includes("video") || /\.(mp4|webm|ogg)$/.test(u)) return "video";
  if (u.endsWith(".pdf") || t.includes("pdf")) return "pdf";
  if (t.includes("3d") || /\.(gltf|glb|obj|mtl)$/.test(u)) return "3d";
  return "other";
}

/** 获取文件扩展名（小写） */
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
  const [versionsNote, setVersionsNote] = useState<string>(""); // 灰色提示
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  // 状态（不用 isLoading）
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // 仅在无可用预览时才展示的错误
  const [fatalPreviewErr, setFatalPreviewErr] = useState<string>("");

  // 载入基本信息
  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    (async () => {
      try {
        setLoadingAsset(true);
        const a = await getAssetById(assetId);
        setAsset(a);
      } finally {
        setLoadingAsset(false);
      }
    })();
  }, [assetId]);

  // 载入预览 URL：预览接口失败→静默降级用详情 file_url；两者都失败才记 fatal 错误
  useEffect(() => {
    if (!assetId || Number.isNaN(assetId)) return;
    (async () => {
      setLoadingPreview(true);
      setFatalPreviewErr("");
      try {
        let url = "";
        try {
          const u = await getPreviewUrl(assetId); // 可能 500
          url = ensureAbsolute(u);
        } catch {
          const a = await getAssetById(assetId);
          url = ensureAbsolute(a?.file_url);
        }
        if (url) {
          setFileUrl(url);
        } else {
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
      // 吃掉错误，给灰色说明，但不抛出让页面爆红
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
    // 独立调用，不让错误冒泡
    refreshVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const kind = useMemo(
    () => inferKind(fileUrl, asset?.type ?? asset?.asset_type),
    [fileUrl, asset]
  );

  const extname = useMemo(() => ext(fileUrl), [fileUrl]);

  async function onDownloadCurrent() {
    if (!assetId || Number.isNaN(assetId)) return;
    try {
      setDownloading(true);
      const blob = await downloadAsset(assetId);
      const filename =
        asset?.name ||
        (fileUrl ? fileUrl.split("/").pop() || "download" : "download");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
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
      // 刷新：当前文件会被指向最新版本
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

  // 只有当没有任何可预览链接时才展示的错误条
  const ErrorBar = fatalPreviewErr && !fileUrl ? (
    <Box mt="12px" p="12px" bg="red.600" color="white" borderRadius="8px" fontSize="14px">
      {fatalPreviewErr}
    </Box>
  ) : null;

  return (
    <Box p="24px">
      {/* 顶部栏 */}
      <Flex align="center" gap="12px" mb="16px">
        <Button onClick={() => router.back()} variant="outline">
          ← Back
        </Button>
        <Text fontSize="20px" fontWeight="bold">Asset Preview</Text>
        <div style={{ flex: 1 }} />
        <Button onClick={onDownloadCurrent} disabled={downloading || !assetId}>
          {downloading ? "Downloading..." : "Download Current"}
        </Button>
      </Flex>

      {ErrorBar}

      {/* 基本信息 + 预览 */}
      <Box border="1px solid #4A5568" borderRadius="8px" p="16px" mb="24px">
        <Flex align="flex-start" gap="16px" wrap="wrap">
          {/* 左列：元信息 */}
          <Box minW="280px">
            <Text><b>Name:</b> {asset?.name ?? "-"}</Text>
            <Text><b>Brand:</b> {asset?.brand ?? "-"}</Text>
            <Text><b>Asset No:</b> {asset?.asset_no ?? "-"}</Text>
            <Text>
              <b>Type:</b>{" "}
              <Badge colorScheme="purple">
                {asset?.type ?? asset?.asset_type ?? "-"}
              </Badge>
            </Text>
            <Text><b>Uploaded:</b> {asset?.upload_date ?? asset?.created_at ?? "-"}</Text>
            <Text><b>Downloads:</b> {asset?.download_count ?? 0}</Text>
            <Text><b>Views:</b> {asset?.view_count ?? 0}</Text>

            <Box mt="8px">
              <Text mb="6px"><b>Tags:</b></Text>
              <Flex wrap="wrap" gap="6px">
                {asset?.tags?.length
                  ? asset.tags.map((t) => (
                      <Badge key={t.id} variant="outline">{t.name}</Badge>
                    ))
                  : <Text color="gray.400">None</Text>}
              </Flex>
            </Box>
          </Box>

          {/* 右列：预览 */}
          <Box flex="1" minWidth="300px" minHeight="420px" border="1px dashed #4A5568" p="12px" borderRadius="8px">
            {loadingPreview && (
              <Box color="gray.300">Loading preview…</Box>
            )}

            {/* 图片 */}
            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type) === "image" && (
              <img src={fileUrl} alt={asset?.name || "image"} style={{ maxHeight: 560, maxWidth: "100%" }} />
            )}

            {/* 视频 */}
            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type) === "video" && (
              <video src={fileUrl} controls style={{ maxHeight: 560, width: "100%" }} />
            )}

            {/* PDF */}
            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type) === "pdf" && (
              <iframe src={fileUrl} style={{ width: "100%", height: 560, border: "none" }} />
            )}

            {/* 3D：优先支持 glb/gltf（单文件最稳） */}
            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type) === "3d" && (ext(fileUrl) === "glb" || ext(fileUrl) === "gltf") && (
              <div style={{ height: 560, width: "100%" }}>
                <ThreeDPreview fileUrl={fileUrl} />
              </div>
            )}

            {/* 3D：OBJ 情况先提示（通常需要 .mtl/纹理） */}
            {!loadingPreview && fileUrl && inferKind(fileUrl, asset?.type ?? asset?.asset_type) === "3d" && ext(fileUrl) === "obj" && (
              <Box color="gray.300">
                当前预览页仅支持单文件 <b>.glb/.gltf</b> 的 3D 预览。OBJ 通常需要 <b>.mtl</b> 与贴图同目录，
                建议把模型转换为 <b>GLB</b> 再上传以获得最佳效果（或在 Assets 页面用你自带 3D 组件预览）。
              </Box>
            )}

            {/* 其他或无预览 */}
            {!loadingPreview && !fileUrl && (
              <Box color="gray.400">No preview available.</Box>
            )}
          </Box>
        </Flex>
      </Box>

      {/* 面板按钮（自定义 Tabs） */}
      <Flex gap="8px" mb="12px">
        <Button
          variant={activeTab === "history" ? "solid" : "outline"}
          onClick={() => setActiveTab("history")}
        >
          Version History
        </Button>
        {canWrite && (
          <Button
            variant={activeTab === "upload" ? "solid" : "outline"}
            onClick={() => setActiveTab("upload")}
          >
            Upload New Version
          </Button>
        )}
      </Flex>

      {/* 面板区 */}
      {activeTab === "history" && (
        <Box>
          <Flex align="center" gap="12px" mb="10px">
            <Button onClick={refreshVersions} disabled={loadingList}>
              {loadingList ? "Refreshing..." : "Refresh"}
            </Button>
            <Text color="gray.400" fontSize="14px">最新在最上面</Text>
            {versionsNote && (
              <Text color="gray.400" fontSize="14px">（{versionsNote}）</Text>
            )}
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
                    <td colSpan={5} style={{ padding: "10px", color: "#A0AEC0" }}>
                      No versions yet.
                    </td>
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
                          <a
                            href={ensureAbsolute(v.file_url)}
                            download
                            target="_blank"
                            rel="noreferrer"
                          >
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
            <Input
              placeholder="e.g. fix color correction"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Box>
          <Flex gap="8px">
            <Button onClick={onUploadNewVersion} disabled={!file || uploading}>
              {uploading ? "Uploading…" : "Upload New Version"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                setNote("");
              }}
              disabled={uploading}
            >
              Clear
            </Button>
          </Flex>
          <Text mt="8px" fontSize="sm" color="gray.400">
            提交后，当前预览将自动指向新版本。
          </Text>
        </Box>
      )}
    </Box>
  );
}
