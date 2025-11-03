"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAssetVersions,
  restoreVersion,
  type AssetVersion,
} from "@/services/assets";

type Props = {
  assetId: number | string;
  /** 当前登录用户的角色，用于控制“恢复”按钮是否显示；不给就默认显示 */
  role?: "admin" | "editor" | "viewer";
  /** 恢复成功后的回调（比如刷新外层 Preview） */
  onRestored?: (newHead: AssetVersion) => void;
  /** 外层触发的刷新信号（比如上传新版成功后++让这里重刷） */
  refreshSignal?: number;
};

export default function VersionHistory({
  assetId,
  role,
  onRestored,
  refreshSignal = 0,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<AssetVersion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canRestore = useMemo(
    () => (role ? role === "admin" || role === "editor" : true),
    [role]
  );

  const fetchVersions = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAssetVersions(assetId);
      // 保底排序：按 version desc、created_at desc
      const sorted = [...data].sort((a, b) => {
        if (b.version !== a.version) return b.version - a.version;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
      setList(sorted);
    } catch (e: any) {
      setError(e?.message || "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions, refreshSignal]);

  const onClickRestore = async (v: AssetVersion) => {
    if (!canRestore) return;
    const yes = window.confirm(`Restore to version v${v.version}?`);
    if (!yes) return;
    try {
      // 用我们服务里的 restoreVersion（POST /assets/:id/versions/:version/restore/）
      const head = await restoreVersion(assetId, v.version);
      // 刷新列表
      await fetchVersions();
      // 通知外层刷新预览
      onRestored?.(head);
    } catch (e: any) {
      alert(e?.message || "Restore failed");
    }
  };

  return (
    <section style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Version History
        </h3>
        <span style={{ opacity: 0.7 }}>
          {loading ? "Loading..." : `Total: ${list.length}`}
        </span>
        {error && (
          <span style={{ color: "crimson", marginLeft: 8 }}>{error}</span>
        )}
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          marginTop: 12,
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <th style={thStyle}>Version</th>
              <th style={thStyle}>Uploaded At</th>
              <th style={thStyle}>Uploaded By</th>
              <th style={thStyle}>Note</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "14px 12px", opacity: 0.7 }}>
                  No versions yet.
                </td>
              </tr>
            ) : (
              list.map((v) => (
                <tr key={v.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={tdStyle}>v{v.version}</td>
                  <td style={tdStyle}>
                    {v.created_at
                      ? new Date(v.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td style={tdStyle}>{v.uploaded_by?.username ?? "-"}</td>
                  <td style={tdStyle}>
                    {/* 兼容我们在 services 里 map 的 note 字段 */}
                    {v.note ?? "-"}
                  </td>
                  <td style={tdStyle}>
                    {canRestore ? (
                      <button
                        onClick={() => onClickRestore(v)}
                        style={btnStyle}
                        title="Restore to this version"
                      >
                        Restore
                      </button>
                    ) : (
                      <span style={{ opacity: 0.6 }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 12px", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "top" };
const btnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent",
  cursor: "pointer",
};
