// src/types/model-viewer.d.ts

declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      src?: string;
      alt?: string;
      poster?: string;
      crossorigin?: string;
      exposure?: string | number;
      "shadow-intensity"?: string | number;

      // boolean attributes (存在即为 true)
      "camera-controls"?: boolean;
      "auto-rotate"?: boolean;
      ar?: boolean;
      "disable-zoom"?: boolean;

      // other optional string attributes
      "camera-orbit"?: string;
      "field-of-view"?: string;
      "max-camera-orbit"?: string;
      "min-camera-orbit"?: string;
      "environment-image"?: string;
      "skybox-image"?: string;
      "ios-src"?: string;

      style?: React.CSSProperties;
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "model-viewer": HTMLElement;
  }
}

export {};
