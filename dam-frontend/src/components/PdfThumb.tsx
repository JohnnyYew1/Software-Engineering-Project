"use client";

import { useEffect, useRef } from "react";
import { GlobalWorkerOptions, getDocument, PDFDocumentProxy } from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs"; // 仅为类型提示；真正的 worker 走 public 路径

type Props = {
  assetId: number | string;
  height?: number;           // 预览高度（宽度自适应）
  onError?: () => void;
};

/** 
 * 用 pdfjs 把第一页渲染成缩略图（canvas）。
 * 依赖 public/pdf.worker.min.mjs（你已经复制过）。
 */
export default function PdfThumb({ assetId, height = 180, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let destroyed = false;

    async function run() {
      try {
        // 1) 设置 worker 路径（public 下）
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // 2) 带鉴权下载 blob
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000"}/api/assets/${assetId}/download/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) throw new Error(`download ${resp.status}`);
        const blob = await resp.blob();

        // 3) 用 objectURL 交给 pdfjs
        const url = URL.createObjectURL(blob);
        revokedUrl = url;

        const pdf = (await getDocument({ url }).promise) as PDFDocumentProxy;
        if (destroyed) return;

        const page1 = await pdf.getPage(1);
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        // 计算缩放：以目标高度为准，宽度跟随
        const viewport0 = page1.getViewport({ scale: 1 });
        const scale = Math.max(0.1, height / viewport0.height);
        const viewport = page1.getViewport({ scale });

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const renderTask = page1.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        // 释放 PDF 资源
        await pdf.destroy();
      } catch (e) {
        console.error("PdfThumb error:", e);
        onError?.();
      }
    }

    run();

    return () => {
      destroyed = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
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
