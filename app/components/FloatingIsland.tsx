"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FloatingIsland() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 초기 크기 설정 (모바일 최적화)
    const getSize = () => {
      if (!containerRef.current) {
        return { width: window.innerWidth, height: window.innerHeight * 0.45 };
      }
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight * 0.45;
      return { width: Math.max(w, 300), height: Math.max(h, 200) };
    };
    
    const { width, height } = getSize();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const planeGeometry = new THREE.PlaneGeometry(2.0, 2.0);
    
    const planeMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      alphaTest: 0.01,
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    // 텍스처 로드 및 설정
    const islandTexture = textureLoader.load(
      "/island.png",
      (tex) => {
        // 텍스처 로드 완료
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        planeMaterial.map = tex;
        planeMaterial.needsUpdate = true;
        
        // 이미지 비율에 맞게 스케일 조정 (원본 비율 정확히 유지)
        const img = tex.image as HTMLImageElement;
        if (img?.naturalWidth && img.naturalHeight) {
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const baseScale = 1.5;
          // 원본 이미지 비율을 정확히 유지 (위아래 압축 방지)
          plane.scale.set(baseScale, baseScale / imgAspect, 1);
        }
      },
      undefined,
      (error) => {
        console.error("Failed to load island texture:", error);
      }
    );
    
    plane.rotation.x = -0.15;
    plane.rotation.y = 0.1;
    plane.position.y = 0;
    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
    pointLight.position.set(2, 2, 5);
    scene.add(pointLight);

    let animationId: number;
    const startTime = Date.now() / 1000;

    function animate() {
      const t = Date.now() / 1000 - startTime;
      plane.position.y = 0 + Math.sin(t * 0.6) * 0.08;
      plane.rotation.y = 0.1 + Math.sin(t * 0.4) * 0.08;
      plane.rotation.x = -0.15 + Math.cos(t * 0.35) * 0.03;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
      if (!containerRef.current) return;
      const { width: w, height: h } = getSize();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      islandTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ zIndex: 10, width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}
