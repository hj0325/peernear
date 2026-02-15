"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface FloatingIslandProps {
  isARMode?: boolean;
  enableMotion?: boolean;
  facingMode?: "environment" | "user";
  onIslandClick?: () => void;
  showClickMe?: boolean;
}

export default function FloatingIsland({
  isARMode = false,
  enableMotion = false,
  facingMode = "environment",
  onIslandClick,
  showClickMe = true,
}: FloatingIslandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clickMeRef = useRef<HTMLDivElement>(null);
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
    // AR 모드에서는 살짝 더 멀리 두되(가림 방지), 너무 작아지지 않게 조정
    camera.position.set(0, 0, isARMode ? 6.0 : 5.5);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

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
    // overlay canvas (above native <video> in AR mode)
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.zIndex = "2";
    renderer.domElement.style.pointerEvents = "auto";
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
    // Keep base scale so "breathing" doesn't accumulate
    let islandBaseScaleX = 1;
    let islandBaseScaleY = 1;
    
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
          const baseScale = isARMode ? 0.75 : 1.5;
          // 원본 이미지 비율을 정확히 유지 (위아래 압축 방지)
          plane.scale.set(baseScale, baseScale / imgAspect, 1);
          islandBaseScaleX = baseScale;
          islandBaseScaleY = baseScale / imgAspect;
        }
      },
      undefined,
      (error) => {
        console.error("Failed to load island texture:", error);
      }
    );
    
    plane.rotation.x = -0.15;
    plane.rotation.y = 0.1;
    // base position (lifted toward center). AR mode centers higher.
    const baseY = isARMode ? 0.62 : 0;
    plane.position.y = baseY;
    // push island slightly away in AR so it doesn't cover screen
    plane.position.z = isARMode ? -0.7 : 0;
    scene.add(plane);

    // AR mode camera background: use native <video> under the WebGL canvas
    let insertedVideoEl: HTMLVideoElement | null = null;

    // Click / tap hit test for island (raycast)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      if (!onIslandClick) return;
      if (!isARMode) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.set(x, y);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(plane, false);
      if (hits.length > 0) onIslandClick();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });

    // Motion parallax (AR-like): rotate camera using device orientation
    let targetYaw = 0;
    let targetPitch = 0;
    let yaw = 0;
    let pitch = 0;
    let removeOrientationListener: null | (() => void) = null;

    if (isARMode) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      videoRef.current = video;

      // put the video behind the canvas for best camera quality
      video.style.position = "absolute";
      video.style.inset = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.style.zIndex = "1";
      video.style.pointerEvents = "none";
      // selfie mode usually feels correct mirrored
      video.style.transform = facingMode === "user" ? "scaleX(-1)" : "none";
      container.style.position = "relative";
      container.insertBefore(video, renderer.domElement);
      insertedVideoEl = video;

      if (enableMotion) {
        const onOrientation = (e: DeviceOrientationEvent) => {
          // beta: x axis (front/back tilt), gamma: y axis (left/right tilt)
          if (e.beta == null || e.gamma == null) return;
          const beta = THREE.MathUtils.degToRad(e.beta);
          const gamma = THREE.MathUtils.degToRad(e.gamma);

          // Small, clamped rotations feel more "anchored"
          // tuned smaller so the island stays nearer center
          targetPitch = THREE.MathUtils.clamp(beta * 0.10, -0.35, 0.35);
          targetYaw = THREE.MathUtils.clamp(gamma * 0.18, -0.45, 0.45);
        };

        window.addEventListener("deviceorientation", onOrientation, true);
        removeOrientationListener = () => {
          window.removeEventListener("deviceorientation", onOrientation, true);
        };
      }

      // 최고 해상도 카메라 스트림 요청 (화질 개선)
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 },
          aspectRatio: { ideal: 16 / 9 },
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
          
          video.play().then(async () => {
            // 비디오가 재생되면 해상도 확인 및 텍스처 업데이트
            if (video.videoWidth && video.videoHeight) {
              console.log("Video element resolution:", video.videoWidth, "x", video.videoHeight);
            }

            // Some browsers ignore initial constraints; try applying again.
            try {
              const track = stream.getVideoTracks()[0];
              await track.applyConstraints({
                width: { ideal: 3840, min: 1920 },
                height: { ideal: 2160, min: 1080 },
                frameRate: { ideal: 30 },
              });
            } catch {
              // ignore
            }
          });

          // 카메라 위치 조정 (AR 효과를 위해)
          camera.position.set(0, 0, isARMode ? 6.0 : 5.5);
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
      // floating motion: up/down bob, slight horizontal sway, slow z-rotation
      const amplitudeY = isARMode ? 0.12 : 0.08;
      const swayX = isARMode ? 0.06 : 0.03;
      const rotZ = isARMode ? 0.06 : 0.03;
      plane.position.y = baseY + Math.sin(t * 0.6) * amplitudeY;
      plane.position.x = Math.sin(t * 0.5) * swayX;
      plane.rotation.y = 0.1 + Math.sin(t * 0.4) * 0.08;
      plane.rotation.x = -0.15 + Math.cos(t * 0.35) * 0.03;
      plane.rotation.z = Math.sin(t * 0.7) * rotZ;
      // subtle "breathing" scale (do NOT accumulate)
      const breathe = isARMode ? 0.010 : 0.006;
      const s = 1 + Math.sin(t * 0.55) * breathe;
      plane.scale.set(islandBaseScaleX * s, islandBaseScaleY * s, 1);

      // AR-like motion: smoothly rotate camera with device orientation
      if (isARMode && enableMotion) {
        const smoothing = 0.08;
        yaw += (targetYaw - yaw) * smoothing;
        pitch += (targetPitch - pitch) * smoothing;
        camera.rotation.set(pitch, yaw, 0);
      }

      // Attach "Click Me!" bubble to island in screen space (no React re-render)
      if (isARMode && showClickMe && clickMeRef.current) {
        const w = container.clientWidth || width;
        const h = container.clientHeight || height;
        const worldPos = new THREE.Vector3();
        plane.getWorldPosition(worldPos);
        const projected = worldPos.project(camera);

        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;

        // Offset to sit near the flower (right & slightly up)
        const ox = Math.min(84, w * 0.18);
        const oy = Math.min(64, h * 0.12);

        const el = clickMeRef.current;
        el.style.left = `${x + ox}px`;
        el.style.top = `${y - oy}px`;
        el.style.opacity = projected.z < 1 ? "1" : "0";
      } else if (clickMeRef.current) {
        clickMeRef.current.style.opacity = "0";
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
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationId);

      if (removeOrientationListener) removeOrientationListener();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      
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
      
      renderer.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      islandTexture.dispose();

      if (insertedVideoEl && container.contains(insertedVideoEl)) {
        container.removeChild(insertedVideoEl);
      }
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isARMode, enableMotion, facingMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ zIndex: 10, width: "100%", height: "100%" }}
    >
      {/* AR mode speech bubble (attached to island via screen-space update) */}
      {isARMode && showClickMe && (
        <div
          ref={clickMeRef}
          className="absolute"
          style={{
            transform: "translate(-50%, -50%)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <div
            className="px-4 py-2 rounded-full text-sm font-medium text-white/95 border border-white/30"
            style={{
              background: "rgba(107, 73, 122, 0.55)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            Click Me!
          </div>
        </div>
      )}
    </div>
  );
}
