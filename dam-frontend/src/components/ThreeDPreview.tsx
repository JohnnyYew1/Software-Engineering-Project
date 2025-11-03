// src/components/ThreeDPreview.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

type Props = {
  fileUrl: string;         // 主模型文件 URL
  style?: React.CSSProperties;
};

// 让 TS 不纠结 <model-viewer>，即使没有全局 d.ts 也能用
const ModelViewer = 'model-viewer' as any;

const isGLTFLike = (url: string) => /\.(glb|gltf)(\?|#|$)/i.test(url);
const isOBJ = (url: string) => /\.obj(\?|#|$)/i.test(url);

/**
 * 3D 预览：
 * - .glb/.gltf 走 <model-viewer>
 * - .obj（自动尝试同名 .mtl）走 Three.js (OBJLoader+MTLLoader)
 */
export default function ThreeDPreview({ fileUrl, style }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mtlUrl = useMemo(() => {
    if (!isOBJ(fileUrl)) return null;
    return fileUrl.replace(/\.obj(\?|#|$)/i, '.mtl$1');
  }, [fileUrl]);

  // OBJ 渲染分支（Three.js）
  useEffect(() => {
    if (!containerRef.current) return;
    if (!isOBJ(fileUrl)) return;

    setError(null);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f7f9);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(2.5, 2, 2.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
    hemi.position.set(0, 20, 0);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    dir.castShadow = true;
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let stopped = false;
    let objRoot: THREE.Object3D | null = null;

    const manager = new THREE.LoadingManager();
    manager.onError = (url) => console.warn('Error loading', url);

    const tryLoadObj = async () => {
      try {
        if (mtlUrl) {
          const mtlLoader = new MTLLoader(manager);
          const materials = await mtlLoader.loadAsync(mtlUrl);
          materials.preload();
          const objLoader = new OBJLoader(manager);
          objLoader.setMaterials(materials);
          objRoot = await objLoader.loadAsync(fileUrl);
        } else {
          const objLoader = new OBJLoader(manager);
          objRoot = await objLoader.loadAsync(fileUrl);
        }

        if (!objRoot) throw new Error('OBJ load failed');

        const box = new THREE.Box3().setFromObject(objRoot);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        objRoot.position.sub(center);
        const maxAxis = Math.max(size.x, size.y, size.z);
        if (maxAxis > 0) objRoot.scale.multiplyScalar(1.5 / maxAxis);

        scene.add(objRoot);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load OBJ/MTL');
      }
    };

    tryLoadObj();

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      if (stopped) return;
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      stopped = true;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
      scene.clear();
    };
  }, [fileUrl, mtlUrl]);

  // glTF 走 model-viewer（你 layout.tsx 已经注入了脚本）
  if (isGLTFLike(fileUrl)) {
    return (
      <ModelViewer
        src={fileUrl}
        style={{ width: '100%', height: '100%', background: 'transparent', ...style }}
        camera-controls
        auto-rotate
        shadow-intensity="0.5"
        crossorigin="anonymous"
        exposure="1"
      />
    );
  }

  // OBJ 容器
  if (isOBJ(fileUrl)) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {error && (
          <div
            style={{
              position: 'absolute',
              left: 8,
              bottom: 8,
              right: 8,
              background: '#fff',
              border: '1px solid #e2e8f0',
              padding: '6px 8px',
              borderRadius: 6,
              fontSize: 12,
              color: '#c53030',
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // 其他格式暂无预览
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <span style={{ color: '#718096', fontSize: 12 }}>
        Preview not available for this 3D format
      </span>
    </div>
  );
}
