"use client";

import { useMemo, useRef, useState } from "react";
import FloatingIsland from "./components/FloatingIsland";
import AdaptationSlider from "./components/AdaptationSlider";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [adaptationValue, setAdaptationValue] = useState(4);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const initialAssistantMessage = useMemo(
    () =>
      "Hi! This is PEER. How are you feeling in today's environment?",
    []
  );

  const requestMotionPermission = async () => {
    // iOS Safari: requires user gesture to allow deviceorientation/devicemotion
    try {
      const anyDeviceOrientationEvent = DeviceOrientationEvent as any;
      if (
        anyDeviceOrientationEvent &&
        typeof anyDeviceOrientationEvent.requestPermission === "function"
      ) {
        const result = await anyDeviceOrientationEvent.requestPermission();
        if (result !== "granted") return false;
      }

      const anyDeviceMotionEvent = DeviceMotionEvent as any;
      if (anyDeviceMotionEvent && typeof anyDeviceMotionEvent.requestPermission === "function") {
        const result = await anyDeviceMotionEvent.requestPermission();
        if (result !== "granted") return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    console.log("Adaptation value:", adaptationValue);
    const allowed = await requestMotionPermission();
    setMotionEnabled(allowed);
    setIsCameraMode(true);
  };
  const toggleFacing = () => {
    setCameraFacing((f) => (f === "environment" ? "user" : "environment"));
  };

  const openChat = () => {
    setIsChatOpen(true);
    setMessages((prev) =>
      prev.length ? prev : [{ role: "assistant" as const, content: initialAssistantMessage }]
    );
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content) return;
    if (isSending) return;

    setIsSending(true);
    setChatInput("");

    let nextMessages: ChatMessage[] = [];
    setMessages((prev) => {
      const base: ChatMessage[] = prev.length
        ? prev
        : [{ role: "assistant" as const, content: initialAssistantMessage }];
      nextMessages = [...base, { role: "user" as const, content }];
      return nextMessages;
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adaptationValue,
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      const reply = (data?.message || "").toString();
      if (reply) setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "지금은 답장을 보내기 어렵다. 잠깐만 기다렸다가 다시 말해줄래?",
        },
      ]);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] overflow-hidden">
      {/* 그라데이션 배경 - 가장 아래 */}
      {!isCameraMode && (
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, #FFFFFF 0%, #F0F9FF 40%, #E0F2FE 60%, #F0F9FF 80%, #FFFFFF 100%)",
            zIndex: 0,
          }}
        />
      )}
      
      {/* 배경 원 (radial gradient + blur) - 배경 위, 섬 아래 */}
      {!isCameraMode && (
        <div
          className="absolute w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(50% 50% at 54.9% 25.39%, #FFFDE6 0%, #9ECDF1 100%)",
            filter: "blur(50px)",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}
        />
      )}
      
      {/* 상단 타이틀 */}
      {!isCameraMode && (
        <div className="w-full pt-6 pb-0 flex justify-center relative flex-shrink-0" style={{ zIndex: 30 }}>
          <h1 className="text-lg font-semibold text-black tracking-wider uppercase">
            PEERNEAR
          </h1>
        </div>
      )}

      {/* 중앙 Floating Island */}
      {isCameraMode ? (
        <div className="absolute inset-0" style={{ zIndex: 10 }}>
          <FloatingIsland
            isARMode={isCameraMode}
            enableMotion={motionEnabled}
            facingMode={cameraFacing}
            onIslandClick={openChat}
          />
        </div>
      ) : (
        // 첫 페이지는 예전처럼 "중앙 영역"만 캔버스로 써서 섬이 과하게 커지지 않게
        <div
          className="absolute left-0 right-0"
          style={{
            top: "72px",
            bottom: "210px",
            zIndex: 10,
          }}
        >
          <FloatingIsland isARMode={false} enableMotion={false} facingMode={cameraFacing} />
        </div>
      )}

      {/* 하단 컨텐츠 영역 */}
      {!isCameraMode ? (
        <div
          className="absolute left-0 right-0 bottom-0 px-6 pb-6 flex flex-col items-center gap-4"
          style={{ zIndex: 20, paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          <p className="text-center text-black text-sm font-normal max-w-sm leading-snug px-2">
            How well do you feel you&apos;ve adapted to your current environment?
          </p>

          <div className="w-full max-w-sm">
            <AdaptationSlider value={adaptationValue} onChange={setAdaptationValue} />
          </div>

          <div className="w-full flex justify-end pr-2 pt-1">
            <button
              onClick={handleNext}
              className="px-4 py-2.5 rounded-full bg-white flex items-center gap-2 text-black font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              style={{ borderRadius: "9999px" }}
            >
              <span className="text-sm">Next</span>
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: "#BFDBFE",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4.5 3L7.5 6L4.5 9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 하단 그라데이션 오버레이 (이미지 참고) */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: "44%",
              zIndex: 20,
              background:
                "linear-gradient(to top, rgba(191,219,254,0.75) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.0) 100%)",
              pointerEvents: "none",
            }}
          />

          {!isChatOpen && (
            <div
              className="absolute left-0 right-0 px-6 flex flex-col items-center gap-3"
              style={{
                zIndex: 25,
                // lift content upward to match reference design
                bottom: "120px",
                paddingBottom: "max(16px, env(safe-area-inset-bottom))",
              }}
            >
              <div className="mt-2 text-center text-black font-medium" style={{ opacity: 0.85 }}>
                Here&apos;s your adaptation level!
              </div>

              <div className="w-full max-w-sm">
                <AdaptationSlider value={adaptationValue} onChange={setAdaptationValue} />
              </div>
            </div>
          )}

          {/* 우하단 액션 버튼들 (요청한 pill 디자인) */}
          <div
            className="absolute right-6 bottom-6"
            style={{ zIndex: 30, paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div
              className="flex items-center rounded-full border border-white/60 shadow"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                padding: 6,
                gap: 8,
              }}
            >
              <button
                aria-label="Capture"
                className="w-12 h-12 rounded-full flex items-center justify-center"
                onClick={() => {}}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 7l1.2-2h3.6L15 7h3a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3z"
                    stroke="#8A8A8A"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="14" r="3" stroke="#8A8A8A" strokeWidth="1.8" />
                </svg>
              </button>

              <button
                onClick={toggleFacing}
                aria-label="Toggle camera"
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "#BFDBFE",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 9c0-1.1.9-2 2-2h6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15 7l2 2-2 2"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 15c0 1.1-.9 2-2 2H9"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 17l-2-2 2-2"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat UI (island click opens) */}
          {isChatOpen && (
            <>
              <div
                className="absolute left-1/2 top-20 w-[90%] max-w-md"
                style={{
                  transform: "translateX(-50%)",
                  zIndex: 40,
                  textAlign: "center",
                  color: "white",
                  textShadow: "0 2px 10px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>
                  {lastAssistant || initialAssistantMessage}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(chatInput);
                }}
                className="absolute left-0 right-0 px-5"
                style={{
                  zIndex: 45,
                  bottom: "18px",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                <div
                  className="w-full flex items-center"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    borderRadius: 9999,
                    border: "1px solid rgba(255,255,255,0.8)",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    padding: 6,
                    gap: 8,
                  }}
                >
                  <input
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Lately, I feel really lonely being by myself..."
                    className="flex-1 bg-transparent outline-none px-3 text-[15px] text-black placeholder:text-black/50"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !chatInput.trim()}
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{
                      background: "#BFDBFE",
                      opacity: isSending || !chatInput.trim() ? 0.5 : 1,
                    }}
                    aria-label="Send"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 17L17 7"
                        stroke="#111"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9 7h8v8"
                        stroke="#111"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
