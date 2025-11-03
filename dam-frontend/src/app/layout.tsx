// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers'; // ✅ 这里保持不变（内部可以是 'use client'）
import './globals.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Digital Asset Management System',
  description: 'Manage your digital assets efficiently',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 如果你有 dark/light 的 data-theme 切换，建议加上 suppressHydrationWarning */}
      <body className={inter.className}>
        {/* ✅ 正确加载 <model-viewer> 的 web component 脚本 */}
        <Script
          strategy="afterInteractive"
          type="module"
          src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
