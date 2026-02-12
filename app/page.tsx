"use client";

import { useState } from "react";
import FloatingIsland from "./components/FloatingIsland";
import AdaptationSlider from "./components/AdaptationSlider";

export default function Home() {
  const [adaptationValue, setAdaptationValue] = useState(4);

  const handleNext = () => {
    console.log("Adaptation value:", adaptationValue);
    // TODO: 다음 페이지로 이동하는 로직 추가
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex flex-col items-center">
      {/* 그라데이션 배경 - 가장 아래 */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #FFFFFF 0%, #F0F9FF 40%, #E0F2FE 60%, #F0F9FF 80%, #FFFFFF 100%)",
          zIndex: 0,
        }}
      />
      
      {/* 배경 원 (radial gradient + blur) - 배경 위, 섬 아래 */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(50% 50% at 54.9% 25.39%, #FFFDE6 0%, #9ECDF1 100%)",
          filter: "blur(50px)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1,
        }}
      />
      
      {/* 상단 타이틀 */}
      <div className="w-full pt-14 pb-2 flex justify-center relative" style={{ zIndex: 30 }}>
        <h1 className="text-xl font-semibold text-black tracking-wider uppercase">
          PEERNEAR
        </h1>
      </div>

      {/* 중앙 Floating Island - 원 위 */}
      <div className="flex-1 w-full relative flex items-end justify-center pb-8" style={{ zIndex: 10, minHeight: "500px", height: "100%" }}>
        <FloatingIsland />
      </div>

      {/* 하단 컨텐츠 영역 */}
      <div className="w-full px-6 pb-10 flex flex-col items-center gap-7 relative" style={{ zIndex: 20 }}>
        {/* 질문 텍스트 */}
        <p className="text-center text-black text-base font-normal max-w-sm leading-relaxed">
          How well do you feel you&apos;ve adapted to your current environment?
        </p>

        {/* 슬라이더 */}
        <div className="w-full max-w-sm">
          <AdaptationSlider value={adaptationValue} onChange={setAdaptationValue} />
        </div>

        {/* Next 버튼 */}
        <div className="w-full flex justify-end pr-4">
          <button
            onClick={handleNext}
            className="px-4 py-2.5 rounded-full bg-gray-100 flex items-center gap-2 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
            style={{
              borderRadius: "9999px",
            }}
          >
            <span className="text-sm">Next</span>
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: "#BFDBFE",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5 3L7.5 6L4.5 9"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
