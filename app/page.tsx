"use client";

import { useState } from "react";
import FloatingIsland from "./components/FloatingIsland";
import AdaptationSlider from "./components/AdaptationSlider";

export default function Home() {
  const [adaptationValue, setAdaptationValue] = useState(4);
  const [isCameraMode, setIsCameraMode] = useState(false);

  const handleNext = () => {
    console.log("Adaptation value:", adaptationValue);
    setIsCameraMode(true);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-between">
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

      {/* 중앙 Floating Island - 원 위 (섬 크기/위치 절대 변경하지 않음) */}
      <div className={`w-full relative flex items-center justify-center ${isCameraMode ? 'h-full' : 'flex-1'}`} style={{ zIndex: 10, minHeight: 0 }}>
        <FloatingIsland isARMode={isCameraMode} />
      </div>

      {/* 하단 컨텐츠 영역 */}
      <div className={`w-full px-6 pb-6 flex flex-col items-center gap-4 relative flex-shrink-0 ${isCameraMode ? 'absolute bottom-0' : ''}`} style={{ zIndex: 20, marginTop: isCameraMode ? 0 : "-10px" }}>
        {/* 질문 텍스트 - 일반 모드에서만 표시 */}
        {!isCameraMode && (
          <p className="text-center text-black text-sm font-normal max-w-sm leading-snug px-2">
            How well do you feel you&apos;ve adapted to your current environment?
          </p>
        )}

        {/* 슬라이더 - 항상 표시 */}
        <div className="w-full max-w-sm">
          <AdaptationSlider value={adaptationValue} onChange={setAdaptationValue} />
        </div>

        {/* Next 버튼 - 일반 모드에서만 표시 */}
        {!isCameraMode && (
          <div className="w-full flex justify-end pr-2 pt-1">
            <button
              onClick={handleNext}
              className="px-4 py-2.5 rounded-full bg-white flex items-center gap-2 text-black font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              style={{
                borderRadius: "9999px",
              }}
            >
              <span className="text-sm">Next</span>
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: "#BFDBFE",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
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
        )}
      </div>
    </div>
  );
}
