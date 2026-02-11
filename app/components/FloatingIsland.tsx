"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FloatingIsland() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const isMobile = width < 768;
    camera.position.set(0, 0, isMobile ? 3.2 : 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const baseScale = isMobile ? 1.45 : 1.2;
    const textureLoader = new THREE.TextureLoader();
    const islandTexture = textureLoader.load("/island.png", (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const img = tex.image as HTMLImageElement;
      if (img?.naturalWidth && img.naturalHeight) {
        const aspect = img.naturalWidth / img.naturalHeight;
        const sx = (aspect > 1 ? 1 : 1 / aspect) * baseScale;
        const sy = (aspect > 1 ? 1 / aspect : 1) * baseScale;
        plane.scale.set(sx, sy, 1);
      }
    });

    const planeGeometry = new THREE.PlaneGeometry(baseScale, baseScale);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: islandTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      alphaTest: 0.01,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -0.25;
    plane.rotation.y = 0.15;
    plane.position.y = isMobile ? 0.05 : 0.1;
    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
    pointLight.position.set(2, 2, 5);
    scene.add(pointLight);

    let animationId: number;
    const startTime = Date.now() / 1000;

    const floatState = { baseY: isMobile ? 0.05 : 0.1 };
    function animate() {
      const t = Date.now() / 1000 - startTime;
      plane.position.y = floatState.baseY + Math.sin(t * 0.6) * 0.08;
      plane.rotation.y = 0.15 + Math.sin(t * 0.4) * 0.08;
      plane.rotation.x = -0.25 + Math.cos(t * 0.35) * 0.03;
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const mobile = w < 768;
      camera.aspect = w / h;
      camera.position.z = mobile ? 3.2 : 4;
      camera.updateProjectionMatrix();
      const scale = mobile ? 1.45 : 1.2;
      floatState.baseY = mobile ? 0.05 : 0.1;
      plane.scale.set(scale, scale, 1);
      plane.position.y = floatState.baseY;
      if (islandTexture.image) {
        const img = islandTexture.image as HTMLImageElement;
        if (img.naturalWidth && img.naturalHeight) {
          const aspect = img.naturalWidth / img.naturalHeight;
          plane.scale.set(
            (aspect > 1 ? 1 : 1 / aspect) * scale,
            (aspect > 1 ? 1 / aspect : 1) * scale,
            1
          );
        }
      }
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
      className="absolute inset-0 w-full h-full min-h-screen"
      aria-hidden
    />
  );
}
