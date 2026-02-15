"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

interface FloatingIslandProps {
  isARMode?: boolean;
  enableMotion?: boolean;
  facingMode?: "environment" | "user";
  adaptationValue?: number;
  onIslandClick?: () => void;
  showClickMe?: boolean;
}

export type FloatingIslandHandle = {
  capture: (opts?: {
    topText?: string | null;
    bottomText?: string | null;
  }) => Promise<void>;
};

const FloatingIsland = forwardRef(function FloatingIsland(
  {
    isARMode = false,
    enableMotion = false,
    facingMode = "environment",
    adaptationValue = 1,
    onIslandClick,
    showClickMe = true,
  }: FloatingIslandProps,
  ref: React.ForwardedRef<FloatingIslandHandle>
) {
  const isSelfieFilterRender = isARMode && facingMode === "user";
  const effectiveShowClickMe = showClickMe && !isSelfieFilterRender;

  const containerRef = useRef<HTMLDivElement>(null);
  const clickMeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const adaptationValueRef = useRef<number>(adaptationValue);

  useEffect(() => {
    adaptationValueRef.current = adaptationValue;
  }, [adaptationValue]);

  useImperativeHandle(
    ref,
    () => ({
      capture: async (opts) => {
        const videoEl = videoRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const containerEl = containerRef.current;

        // Ensure latest WebGL frame is present for drawImage()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        // Prefer video resolution for crisp captures
        const outW =
          (videoEl && videoEl.videoWidth) || overlayCanvas?.width || window.innerWidth;
        const outH =
          (videoEl && videoEl.videoHeight) || overlayCanvas?.height || window.innerHeight;

        const out = document.createElement("canvas");
        out.width = outW;
        out.height = outH;

        const ctx = out.getContext("2d");
        if (!ctx) return;

        // Scale UI drawings to match capture resolution (e.g., 4K)
        const containerRect = containerEl?.getBoundingClientRect();
        const uiScaleRaw =
          containerRect && containerRect.width > 0 ? outW / containerRect.width : 1;
        const uiScale = Math.max(1, Math.min(8, uiScaleRaw));

        // Draw camera video first (if present)
        if (videoEl && videoEl.readyState >= 2) {
          if (facingMode === "user") {
            // mirror selfie capture to match on-screen view
            ctx.save();
            ctx.translate(outW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoEl, 0, 0, outW, outH);
            ctx.restore();
          } else {
            ctx.drawImage(videoEl, 0, 0, outW, outH);
          }
        }

        // Draw three.js overlay
        if (overlayCanvas) {
          ctx.drawImage(overlayCanvas, 0, 0, outW, outH);
        }

        const drawWrappedCenteredText = (text: string, y: number, style?: {
          font?: string;
          fontSize?: number;
          fontWeight?: number;
          fillStyle?: string;
          maxWidthRatio?: number;
          lineHeight?: number;
          shadowColor?: string;
          shadowBlur?: number;
          shadowOffsetY?: number;
        }) => {
          const {
            fontSize = 20,
            fontWeight = 600,
            fillStyle = "#FFFFFF",
            maxWidthRatio = 0.9,
            lineHeight = 26,
            shadowColor = "rgba(0,0,0,0.35)",
            shadowBlur = 12,
            shadowOffsetY = 2,
          } = style || {};

          const maxW = outW * maxWidthRatio;
          ctx.save();
          const scaledFontSize = Math.round(fontSize * uiScale);
          ctx.font = `${fontWeight} ${scaledFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
          ctx.fillStyle = fillStyle;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = shadowBlur * uiScale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = shadowOffsetY * uiScale;

          // very small word-wrapping
          const words = text.split(/\s+/);
          const lines: string[] = [];
          let line = "";
          for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (ctx.measureText(test).width <= maxW) {
              line = test;
            } else {
              if (line) lines.push(line);
              line = w;
            }
          }
          if (line) lines.push(line);

          let yy = y;
          for (const l of lines) {
            ctx.fillText(l, outW / 2, yy);
            yy += lineHeight * uiScale;
          }
          ctx.restore();
        };

        // Draw Click Me bubble (DOM) onto capture
        if (containerEl && clickMeRef.current && effectiveShowClickMe) {
          const bubbleEl = clickMeRef.current;
          const crect = containerEl.getBoundingClientRect();
          const brect = bubbleEl.getBoundingClientRect();
          if (crect.width > 0 && crect.height > 0) {
            const sx = outW / crect.width;
            const sy = outH / crect.height;
            const bw = brect.width * sx;
            const bh = brect.height * sy;
            const bx = (brect.left - crect.left) * sx;
            const by = (brect.top - crect.top) * sy;

            const r = Math.min(999, bh / 2);
            ctx.save();
            ctx.fillStyle = "rgba(107, 73, 122, 0.55)";
            ctx.strokeStyle = "rgba(255,255,255,0.30)";
            ctx.lineWidth = Math.max(1, 1.5 * sx);
            ctx.shadowColor = "rgba(0,0,0,0.18)";
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 8;

            const roundRect = (x: number, y: number, w: number, h: number, rad: number) => {
              ctx.beginPath();
              ctx.moveTo(x + rad, y);
              ctx.arcTo(x + w, y, x + w, y + h, rad);
              ctx.arcTo(x + w, y + h, x, y + h, rad);
              ctx.arcTo(x, y + h, x, y, rad);
              ctx.arcTo(x, y, x + w, y, rad);
              ctx.closePath();
            };
            roundRect(bx, by, bw, bh, r);
            ctx.fill();
            ctx.stroke();

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.font = `${Math.round(14 * sx)}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Click Me!", bx + bw / 2, by + bh / 2);
            ctx.restore();
          }
        }

        // Draw UI texts (top chat reply / bottom blossoms message)
        const topText = (opts?.topText || "").trim();
        const bottomText = (opts?.bottomText || "").trim();
        if (topText) {
          drawWrappedCenteredText(topText, outH * 0.12, {
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 30,
            maxWidthRatio: 0.92,
          });
        }
        if (bottomText) {
          // place above bottom overlay area
          drawWrappedCenteredText(bottomText, outH * 0.62, {
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 30,
            maxWidthRatio: 0.92,
          });
        }

        const blob: Blob | null = await new Promise((resolve) =>
          out.toBlob((b) => resolve(b), "image/png")
        );
        if (!blob) return;

        // Prefer native share sheet on mobile (more reliable than download)
        try {
          const file = new File([blob], `peernear-capture-${Date.now()}.png`, {
            type: "image/png",
          });
          const nav: any = navigator;
          if (nav?.share && nav?.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title: "Peernear Capture" });
            return;
          }
        } catch {
          // fall back to download
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `peernear-capture-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Also open image in a new tab for browsers that ignore download
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {
          // ignore
        }
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      },
    }),
    [facingMode]
  );

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

    const isSelfieFilter = isARMode && facingMode === "user";

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      // IMPORTANT: required for reliable canvas capture (drawImage / toBlob)
      preserveDrawingBuffer: true,
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
    overlayCanvasRef.current = renderer.domElement as unknown as HTMLCanvasElement;
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
    // selfie filter mode: hide island plane
    plane.visible = !isSelfieFilter;
    scene.add(plane);

    // AR mode camera background: use native <video> under the WebGL canvas
    let insertedVideoEl: HTMLVideoElement | null = null;

    // Selfie filter sprites (face overlay)
    const filterGroup = new THREE.Group();
    camera.add(filterGroup);
    // farther = smaller sprites on screen (better for selfie)
    let filterDepth = 1.45;

    let flowerTex: THREE.Texture | null = null;
    let greenTex: THREE.Texture | null = null;
    let leafTex: THREE.Texture | null = null;
    const flowerSprites: THREE.Sprite[] = [];
    const decoSprites: THREE.Sprite[] = [];
    let currentFlowerCount = 0;

    const createSprite = (tex: THREE.Texture, scale: number) => {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        opacity: 1,
      });
      // Make edges crisper (reduce semi-transparent fringe)
      mat.alphaTest = 0.12;
      const s = new THREE.Sprite(mat);
      s.renderOrder = 20;
      s.scale.set(scale, scale, 1);
      return s;
    };

    const getDesiredFlowerCount = () => {
      const v = Number(adaptationValueRef.current || 1);
      return Math.max(1, Math.min(10, Math.round(v)));
    };

    const syncFlowerCount = () => {
      if (!isSelfieFilter || !flowerTex) return;
      const desired = getDesiredFlowerCount();
      if (desired === currentFlowerCount) return;

      // add / remove sprites to match desired count
      while (flowerSprites.length < desired) {
        // random size/depth for more 3D feeling
        const baseScale = 0.16 + Math.random() * 0.14;
        const s = createSprite(flowerTex, baseScale);
        s.userData = {
          phase: Math.random() * Math.PI * 2,
          // layered motion (avoid perfect circles)
          s1: 0.55 + Math.random() * 0.55,
          s2: 0.35 + Math.random() * 0.55,
          s3: 0.45 + Math.random() * 0.65,
          s4: 0.30 + Math.random() * 0.60,
          ax1: 0.18 + Math.random() * 0.16,
          ax2: 0.10 + Math.random() * 0.14,
          ay1: 0.14 + Math.random() * 0.16,
          ay2: 0.10 + Math.random() * 0.16,
          driftX: 0.08 + Math.random() * 0.12,
          driftY: 0.08 + Math.random() * 0.12,
          flutter: 0.12 + Math.random() * 0.22,
          zBase: -0.10 + Math.random() * 0.20,
          baseScale,
        };
        filterGroup.add(s);
        flowerSprites.push(s);
      }
      while (flowerSprites.length > desired) {
        const s = flowerSprites.pop();
        if (!s) break;
        filterGroup.remove(s);
        (s.material as THREE.Material).dispose();
      }
      currentFlowerCount = desired;
    };

    const makeDecos = () => {
      if (!isSelfieFilter || !greenTex || !leafTex) return;
      // fixed decoration counts
      const makeOne = (tex: THREE.Texture, scale: number) => {
        const baseScale = scale * (0.80 + Math.random() * 0.55);
        const s = createSprite(tex, baseScale);
        s.userData = {
          phase: Math.random() * Math.PI * 2,
          s1: 0.35 + Math.random() * 0.55,
          s2: 0.25 + Math.random() * 0.55,
          s3: 0.30 + Math.random() * 0.60,
          s4: 0.22 + Math.random() * 0.55,
          ax1: 0.22 + Math.random() * 0.20,
          ax2: 0.12 + Math.random() * 0.18,
          ay1: 0.18 + Math.random() * 0.20,
          ay2: 0.12 + Math.random() * 0.18,
          driftX: 0.12 + Math.random() * 0.16,
          driftY: 0.12 + Math.random() * 0.16,
          flutter: 0.18 + Math.random() * 0.28,
          zBase: -0.14 + Math.random() * 0.28,
          baseScale,
        };
        filterGroup.add(s);
        decoSprites.push(s);
      };

      for (let i = 0; i < 3; i++) makeOne(greenTex, 0.20);
      for (let i = 0; i < 3; i++) makeOne(leafTex, 0.18);
    };

    // Face tracking (optional): use built-in FaceDetector when available, else fallback center
    let faceCxTarget = 0.5;
    let faceCyTarget = 0.42;
    let faceCx = 0.5;
    let faceCy = 0.42;
    let faceDetectTimer: number | null = null;

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
      const hits = isSelfieFilter
        ? raycaster.intersectObjects([...flowerSprites, ...decoSprites], false)
        : raycaster.intersectObject(plane, false);
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

      // selfie filter: load sprite textures once
      if (isSelfieFilter) {
        flowerTex = textureLoader.load("/flower.png");
        greenTex = textureLoader.load("/green.png");
        leafTex = textureLoader.load("/leaf.png");
        [flowerTex, greenTex, leafTex].forEach((t) => {
          if (!t) return;
          t.colorSpace = THREE.SRGBColorSpace;
          t.minFilter = THREE.LinearFilter;
          t.magFilter = THREE.LinearFilter;
        });
        makeDecos();
        syncFlowerCount();
      }

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

            // FaceDetector (if supported): update face center periodically
            if (isSelfieFilter && typeof (window as any).FaceDetector === "function") {
              try {
                const detector = new (window as any).FaceDetector({
                  fastMode: true,
                  maxDetectedFaces: 1,
                });
                faceDetectTimer = window.setInterval(async () => {
                  if (!video.videoWidth || !video.videoHeight) return;
                  try {
                    const faces = await detector.detect(video);
                    const face = faces && faces[0];
                    if (face && face.boundingBox) {
                      const bb = face.boundingBox;
                      faceCxTarget = (bb.x + bb.width / 2) / video.videoWidth;
                      faceCyTarget = (bb.y + bb.height / 2) / video.videoHeight;
                      // clamp
                      faceCxTarget = Math.max(0.05, Math.min(0.95, faceCxTarget));
                      faceCyTarget = Math.max(0.05, Math.min(0.95, faceCyTarget));
                    }
                  } catch {
                    // ignore detection errors
                  }
                }, 200);
              } catch {
                // ignore
              }
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

      // Selfie filter animation around face
      if (isSelfieFilter) {
        // smooth face center
        const faceSmooth = 0.12;
        faceCx += (faceCxTarget - faceCx) * faceSmooth;
        faceCy += (faceCyTarget - faceCy) * faceSmooth;

        // convert normalized face center to camera-local coords at fixed depth
        const aspect = camera.aspect;
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const planeH = 2 * filterDepth * Math.tan(vFov / 2);
        const planeW = planeH * aspect;
        let xLocal = (faceCx - 0.5) * planeW;
        const yLocal = (0.5 - faceCy) * planeH;
        // video is mirrored in selfie mode; mirror overlay too so it sticks to face
        xLocal *= -1;

        // place group near face
        filterGroup.position.set(xLocal, yLocal, -filterDepth);

        // update counts & sprite motion
        syncFlowerCount();
        const allSprites = [...flowerSprites, ...decoSprites];
        for (let i = 0; i < allSprites.length; i++) {
          const sp = allSprites[i];
          const d = sp.userData || {};
          const phase = d.phase || 0;
          const s1 = d.s1 || 0.6;
          const s2 = d.s2 || 0.45;
          const s3 = d.s3 || 0.55;
          const s4 = d.s4 || 0.35;
          const ax1 = d.ax1 || 0.22;
          const ax2 = d.ax2 || 0.14;
          const ay1 = d.ay1 || 0.18;
          const ay2 = d.ay2 || 0.14;
          const driftX = d.driftX || 0.12;
          const driftY = d.driftY || 0.12;
          const flutter = d.flutter || 0.18;
          const zBase = d.zBase || 0;
          const baseScale = d.baseScale || 0.24;

          // organic drift (lissajous + slow wander)
          const x1 = Math.sin(t * s1 + phase) * ax1;
          const x2 = Math.sin(t * s2 + phase * 1.37) * ax2;
          const x3 = Math.sin(t * 0.22 + phase * 0.73) * driftX;
          const y1 = Math.cos(t * s3 + phase * 0.91) * ay1;
          const y2 = Math.sin(t * s4 + phase * 1.11) * ay2;
          const y3 = Math.sin(t * 0.18 + phase * 0.58) * driftY;

          // subtle "face-halo" curve so they tend to orbit the face perimeter
          const halo = 0.24 + Math.sin(t * 0.12 + phase) * 0.03;
          sp.position.x = x1 + x2 + x3;
          sp.position.y = (y1 + y2 + y3) * 0.85 + Math.sin(t * (0.9 + flutter) + phase) * 0.03;
          sp.position.z = zBase + Math.sin(t * 0.33 + phase) * 0.04;

          // pull slightly toward halo ring (prevents clumping in center)
          const r = Math.sqrt(sp.position.x * sp.position.x + sp.position.y * sp.position.y) || 1;
          sp.position.x *= halo / r;
          sp.position.y *= halo / r;

          // depth-based scale for 3D feeling
          const depthScale = 1 + sp.position.z * 0.9;
          const wobble = 1 + Math.sin(t * (0.6 + flutter) + phase) * 0.08;
          sp.scale.set(baseScale * depthScale * wobble, baseScale * depthScale * wobble, 1);

          // prettier rotation: leaves flutter more
          const rotBase = (Math.sin(t * (0.35 + flutter) + phase) * 0.35) + (Math.cos(t * 0.18 + phase) * 0.15);
          (sp.material as THREE.SpriteMaterial).rotation = rotBase;
          (sp.material as THREE.SpriteMaterial).opacity = 1;
        }
      }

      // Attach "Click Me!" bubble to island in screen space (no React re-render)
      if (isARMode && effectiveShowClickMe && clickMeRef.current) {
        const w = container.clientWidth || width;
        const h = container.clientHeight || height;
        const worldPos = new THREE.Vector3();
        (isSelfieFilter ? filterGroup : plane).getWorldPosition(worldPos);
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
      if (faceDetectTimer) window.clearInterval(faceDetectTimer);
      
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

      // dispose selfie sprites
      for (const s of [...flowerSprites, ...decoSprites]) {
        filterGroup.remove(s);
        (s.material as THREE.Material).dispose();
      }
      if (flowerTex) flowerTex.dispose();
      if (greenTex) greenTex.dispose();
      if (leafTex) leafTex.dispose();

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
      {isARMode && effectiveShowClickMe && (
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
});

export default FloatingIsland;
