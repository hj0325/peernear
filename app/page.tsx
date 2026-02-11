import FloatingIsland from "./components/FloatingIsland";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* 1. 푸른 하늘 배경 */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] via-[#b8e0f5] to-[#a8d8f0]"
        aria-hidden
      />

      {/* 2. 하얀 원들 + 블러 (서서히 움직임) */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute w-[280px] h-[280px] rounded-full bg-white/40 blur-[80px] animate-float1 top-[10%] left-[5%]" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-white/35 blur-[70px] animate-float2 top-[50%] right-[10%]" />
        <div className="absolute w-[240px] h-[240px] rounded-full bg-white/30 blur-[75px] animate-float3 bottom-[15%] left-[15%]" />
        <div className="absolute w-[160px] h-[160px] rounded-full bg-white/35 blur-[60px] animate-float4 top-[25%] right-[25%]" />
        <div className="absolute w-[220px] h-[220px] rounded-full bg-white/25 blur-[70px] animate-float5 top-[60%] left-[8%]" />
        <div className="absolute w-[180px] h-[180px] rounded-full bg-white/30 blur-[65px] animate-float6 bottom-[25%] right-[20%]" />
      </div>

      {/* 3. PEERNEAR 제목 (island 바로 뒤 레이어) */}
      <h1
        className="absolute left-1/2 -translate-x-1/2 z-10 text-[#2c5282] font-medium tracking-[0.2em] select-none"
        style={{
          fontFamily: "Helvetica, Arial, sans-serif",
          top: "22%",
          fontSize: "clamp(1.75rem, 6vw, 2.5rem)",
          fontWeight: 500,
        }}
      >
        PEERNEAR
      </h1>

      {/* 4. Island (가장 위 레이어, 모바일 메인 크기/위치) */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pt-[8%]">
        <div className="w-full h-full max-w-[420px] max-h-[75vh] md:max-h-[70vh]">
          <FloatingIsland />
        </div>
      </div>
    </div>
  );
}
