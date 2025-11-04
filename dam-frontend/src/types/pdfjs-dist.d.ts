// 让 TS 接受 pdfjs v4 的 ESM 入口
declare module 'pdfjs-dist/build/pdf.mjs' {
  const pdfjsLib: any;
  export default pdfjsLib;
}

// 可选：如果你在别处显式 import 了 worker，也一起声明
declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
  const worker: any;
  export default worker;
}
