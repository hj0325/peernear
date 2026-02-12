"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface FloatingIslandProps {
  isARMode?: boolean;
}

export default function FloatingIsland({ isARMode = false }: FloatingIslandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 초기 크기 설정 (모바일 최적화)
    const getSize = () => {
      if (!containerRef.current) {
        return { width: window.innerWidth, height: window.innerHeight };
      }
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      return { width: Math.max(w, 300), height: Math.max(h, 300) };
    };
    
    const { width, height } = getSize();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    // AR 모드일 때는 최대 픽셀 비율 사용 (화질 개선)
    const pixelRatio = isARMode ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
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
          // AR 모드일 때는 더 작게, 일반 모드일 때는 기존 크기 유지
          const baseScale = isARMode ? 0.6 : 1.5;
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

    // AR 모드: 카메라 배경 설정
    let videoTexture: THREE.VideoTexture | null = null;
    let backgroundPlane: THREE.Mesh | null = null;

    if (isARMode) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      videoRef.current = video;

      // 최고 해상도 카메라 스트림 요청 (화질 개선)
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30 },
        },
      };

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          streamRef.current = stream;
          video.srcObject = stream;
          
          // 비디오 해상도 설정 (화질 개선)
          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          console.log("Camera resolution:", settings.width, "x", settings.height);
          
          video.play().then(() => {
            // 비디오가 재생되면 해상도 확인 및 텍스처 업데이트
            if (video.videoWidth && video.videoHeight) {
              console.log("Video element resolution:", video.videoWidth, "x", video.videoHeight);
              
              // 비디오 해상도에 맞춰 텍스처 크기 업데이트
              if (videoTexture) {
                videoTexture.needsUpdate = true;
              }
              
              // 렌더러 해상도도 비디오 해상도에 맞춰 조정 (화질 개선)
              const videoAspect = video.videoWidth / video.videoHeight;
              const containerAspect = width / height;
              
              // 비디오 해상도를 최대한 활용
              if (video.videoWidth > width || video.videoHeight > height) {
                const scale = Math.max(video.videoWidth / width, video.videoHeight / height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio * scale, 4));
              }
            }
          });

          videoTexture = new THREE.VideoTexture(video);
          videoTexture.colorSpace = THREE.SRGBColorSpace;
          // 최고 화질 텍스처 설정
          videoTexture.minFilter = THREE.LinearFilter;
          videoTexture.magFilter = THREE.LinearFilter;
          videoTexture.generateMipmaps = false;
          videoTexture.flipY = true; // 카메라 위아래 수정
          videoTexture.format = THREE.RGBAFormat;

          // 카메라 피드를 배경으로 사용하는 큰 평면 생성 (화면 비율에 맞춤)
          const aspect = width / height;
          const bgWidth = 10;
          const bgHeight = bgWidth / aspect;
          const bgGeometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
          const bgMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            side: THREE.DoubleSide,
          });
          backgroundPlane = new THREE.Mesh(bgGeometry, bgMaterial);
          backgroundPlane.position.z = -5;
          scene.add(backgroundPlane);

          // 카메라 위치 조정 (AR 효과를 위해)
          camera.position.set(0, 0, 5.5);
        })
        .catch((error) => {
          console.error("Error accessing camera:", error);
        });
    } else {
      // 일반 모드: 라이트 추가
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      scene.add(ambientLight);
      const pointLight = new THREE.PointLight(0xffffff, 0.8, 20);
      pointLight.position.set(2, 2, 5);
      scene.add(pointLight);
    }

    let animationId: number;
    const startTime = Date.now() / 1000;

    function animate() {
      const t = Date.now() / 1000 - startTime;
      plane.position.y = 0 + Math.sin(t * 0.6) * 0.08;
      plane.rotation.y = 0.1 + Math.sin(t * 0.4) * 0.08;
      plane.rotation.x = -0.15 + Math.cos(t * 0.35) * 0.03;
      
      // 비디오 텍스처 업데이트
      if (videoTexture) {
        videoTexture.needsUpdate = true;
      }
      
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
      
      // AR 모드일 때 픽셀 비율 업데이트 (최대 해상도 사용)
      if (isARMode) {
        const pixelRatio = window.devicePixelRatio;
        renderer.setPixelRatio(pixelRatio);
      }
      
      // AR 모드일 때 배경 평면 크기 업데이트
      if (isARMode && backgroundPlane) {
        const aspect = w / h;
        const bgWidth = 10;
        const bgHeight = bgWidth / aspect;
        backgroundPlane.geometry.dispose();
        backgroundPlane.geometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
      }
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);
      
      // 카메라 스트림 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // 비디오 정리
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      
      // 텍스처 정리
      if (videoTexture) {
        videoTexture.dispose();
      }
      
      renderer.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      islandTexture.dispose();
      
      if (backgroundPlane) {
        backgroundPlane.geometry.dispose();
        (backgroundPlane.material as THREE.Material).dispose();
      }
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isARMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ zIndex: 10, width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}
