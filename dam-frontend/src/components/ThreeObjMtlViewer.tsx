'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Props = {
  /** .obj 或 .mtl 的 URL（任意一个都可以） */
  srcUrl: string;
  width?: number | string;
  height?: number | string;
};

function derivePairUrls(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.endsWith('.obj')) {
    return { objUrl: raw, mtlUrl: raw.replace(/\.obj$/i, '.mtl') };
  }
  if (lower.endsWith('.mtl')) {
    return { objUrl: raw.replace(/\.mtl$/i, '.obj'), mtlUrl: raw };
  }
  // 兜底：既不是 obj 也不是 mtl
  return { objUrl: raw, mtlUrl: raw.replace(/\.[^/.]+$/i, '.mtl') };
}

const ThreeObjMtlViewer: React.FC<Props> = ({ srcUrl, width = '100%', height = '100%' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  // 初始化
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f7f7);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    // 控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // Resize
    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.setSize(clientWidth, clientHeight);
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
    });
    ro.observe(container);
    resizeObsRef.current = ro;

    // 渲染循环
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // 清理
    return () => {
      cancelAnimationFrame(raf);
      resizeObsRef.current?.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
        const mat: any = mesh.material;
        if (Array.isArray(mat)) mat.forEach(m => m?.dispose?.());
        else mat?.dispose?.();
      });
    };
  }, []);

  // 加载 OBJ(+MTL，失败则回退 OBJ-only)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 清掉旧模型
    const old = scene.getObjectByName('ObjMtlRoot');
    if (old) scene.remove(old);

    const { objUrl, mtlUrl } = derivePairUrls(srcUrl);
    const manager = new THREE.LoadingManager();

    const loadObjOnly = () => {
      const objLoader = new OBJLoader(manager);
      objLoader.load(
        objUrl,
        (obj: THREE.Object3D) => {
          obj.name = 'ObjMtlRoot';

          // 默认材质（OBJ-only）
          obj.traverse((child: any) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xb0b0b0,
                metalness: 0.2,
                roughness: 0.8,
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // 居中并等比缩放
          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);
          obj.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) obj.scale.setScalar(1.2 / maxDim);

          scene.add(obj);
        },
        undefined,
        (err: unknown) => {
          console.error('OBJ load error (fallback):', err);
          // 静默失败，避免打断 UI；外层会显示空预览容器
        }
      );
    };

    // 优先尝试 MTL
    const mtlLoader = new MTLLoader(manager);
    const mtlBase = mtlUrl.substring(0, mtlUrl.lastIndexOf('/') + 1);
    mtlLoader.setResourcePath(mtlBase);

    mtlLoader.load(
      mtlUrl,
      (materials: any) => {
        materials.preload();

        const objLoader = new OBJLoader(manager);
        objLoader.setMaterials(materials);

        objLoader.load(
          objUrl,
          (obj: THREE.Object3D) => {
            obj.name = 'ObjMtlRoot';

            // 居中并等比缩放
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) obj.scale.setScalar(1.2 / maxDim);

            scene.add(obj);
          },
          undefined,
          (err: unknown) => {
            console.error('OBJ load error (with MTL):', err);
            // OBJ 失败也回退到 OBJ-only
            loadObjOnly();
          }
        );
      },
      undefined,
      (err: unknown) => {
        console.warn('MTL load error, fallback to OBJ-only:', err);
        loadObjOnly();
      }
    );
  }, [srcUrl]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, borderRadius: 8, overflow: 'hidden', background: '#f7f7f7' }}
    />
  );
};

export default ThreeObjMtlViewer;
