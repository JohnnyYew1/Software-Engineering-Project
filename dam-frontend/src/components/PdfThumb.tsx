"use client";

import { useEffect, useRef } from "react";
import { GlobalWorkerOptions, getDocument, PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { getPreviewUrl } from "@/services/assets"; // ★ 用预览直链

type Props = {
  assetId: number | string;
  height?: number;
  onError?: () => void;
};

/**
 * 用 pdfjs 把第一页渲染成缩略图（canvas）。
 * 走 preview 直链，绝不调用 /download/，避免误计数。
 */
export default function PdfThumb({ assetId, height = 180, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let destroyed = false;
    let revokeUrl: string | null = null;

    async function run() {
      try {
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // 1) 先拿预览直链（后端返回 file_url）
        const fileUrl = await getPreviewUrl(assetId); // ★ 关键：不走 download
        if (!fileUrl) throw new Error("no preview url");

        // 2) 直接给 pdf.js 用 URL（同源/CORS 允许范围下可直接用；如需鉴权再 fetch->blob）
        // 为更稳妥，这里 fetch 一次再转 objectURL，避免跨源 Range/权限问题。
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const resp = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) throw new Error(`preview fetch ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        revokeUrl = url;

        const pdf = (await getDocument({ url }).promise) as PDFDocumentProxy;
        if (destroyed) return;

        const page1 = await pdf.getPage(1);
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        const viewport0 = page1.getViewport({ scale: 1 });
        const scale = Math.max(0.1, height / viewport0.height);
        const viewport = page1.getViewport({ scale });

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const renderTask = page1.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        await pdf.destroy();
      } catch (e) {
        console.error("PdfThumb error:", e);
        onError?.();
      }
    }

    run();

    return () => {
      destroyed = true;
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [assetId, height, onError]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        height,
        width: "auto",
        maxWidth: "100%",
        background: "white",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,.08)",
      }}
    />
  );
}
