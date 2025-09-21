import React, { useRef } from "react";
import LiquidGlass from "liquid-glass-react";

export default function LiquidAppDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    // 让整页中心对齐
    <div className="min-h-screen grid place-items-center"
         style={{ background: "linear-gradient(135deg,#0f172a,#1e293b,#0b1020)" }}>
      {/* 固定尺寸的卡片容器（真正控制大小的地方） */}
      <div ref={containerRef}
           className="relative overflow-hidden"
           style={{ width: 360, height: 460, borderRadius: 24 }}>
        {/* 玻璃：绝对铺满容器，用 style 而不是 className 控尺寸 */}
        <LiquidGlass
          mouseContainer={containerRef}
          displacementScale={120}
          blurAmount={0.28}
          saturation={150}
          aberrationIntensity={3}
          elasticity={0.5}
          cornerRadius={24}
          // 关键：贴满父容器，禁止自身决定大小
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 24 }}
        />

        {/* 内容层：叠在玻璃上方 */}
        <div className="absolute inset-0 p-20 flex flex-col items-center justify-center gap-14">
          <h1 className="text-white text-xl font-semibold">Liquid Glass Demo</h1>

          <button className="px-6 h-11 rounded-full font-semibold text-white
                             bg-white/10 border border-white/25 backdrop-blur-2xl
                             hover:bg-white/18 hover:border-white/40 transition">
            ▶ Play
          </button>

          <button className="px-6 h-11 rounded-full font-semibold text-white
                             bg-white/10 border border-white/25 backdrop-blur-2xl
                             hover:bg-white/18 hover:border-white/40 transition">
            ✨ Affirm
          </button>

          <button className="px-6 h-11 rounded-full font-semibold text-white
                             bg-white/10 border border-white/25 backdrop-blur-2xl
                             hover:bg-white/18 hover:border-white/40 transition">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
