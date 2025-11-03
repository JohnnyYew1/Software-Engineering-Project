// src/types/model-viewer.d.ts

// 让 TS 认识 <model-viewer> 这个自定义元素
declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      // 常用属性，按需可继续补充
      src?: string;
      alt?: string;
      poster?: string;
      crossorigin?: string;
      exposure?: string | number;
      "shadow-intensity"?: string | number;

      // boolean 属性（存在即为 true）
      "camera-controls"?: boolean;
      "auto-rotate"?: boolean;
      ar?: boolean;
      "disable-zoom"?: boolean;

      // 其它可选字符串属性
      "camera-orbit"?: string;
      "field-of-view"?: string;
      "max-camera-orbit"?: string;
      "min-camera-orbit"?: string;
      "environment-image"?: string;
      "skybox-image"?: string;

      // iOS 专用的备用模型地址
      "ios-src"?: string;
      style?: React.CSSProperties;
    };
  }
}

// 可选：补一个 tagName 到 HTMLElement 的映射
declare global {
  interface HTMLElementTagNameMap {
    "model-viewer": HTMLElement;
  }
}

export {}; // 确保这是一个模块
