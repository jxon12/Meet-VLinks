import React, { useEffect, useRef } from "react";

/** 沉浸式海洋背景：固定在最底层，不挡交互(pointer-events:none) */
export default function BackgroundOcean() {
  const wrapRef = useRef<HTMLDivElement>(null);

  // 轻视差：随滚动微动
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]"));
    const onScroll = () => {
      const y = window.scrollY;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth || 0);
        const offset = Math.round((y * depth) / 8);
        layer.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(80% 60% at 50% 0%, rgba(110,140,200,0.14), rgba(0,10,30,0) 60%), linear-gradient(180deg,#061224 0%, #08162a 60%, #030913 100%)",
      }}
    >
      {/* 远景星光 */}
      <div
        data-depth="0.1"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(2px 2px at 15% 25%, rgba(255,255,255,0.08) 40%, transparent 41%), radial-gradient(2px 2px at 65% 10%, rgba(255,255,255,0.06) 40%, transparent 41%), radial-gradient(2px 2px at 85% 40%, rgba(255,255,255,0.06) 40%, transparent 41%)",
          backgroundRepeat: "no-repeat",
          filter: "blur(0.3px)",
        }}
      />

      {/* 中景：水母 */}
      <div className="absolute inset-0">
        <div data-depth="0.25" className="absolute left-[8%] top-[22%] animate-float-slow">
          <Jellyfish size={120} opacity={0.6} />
        </div>
        <div data-depth="0.22" className="absolute right-[10%] top-[35%] animate-float-slow delay-300">
          <Jellyfish size={160} opacity={0.5} />
        </div>
        <div data-depth="0.18" className="absolute left-[18%] bottom-[22%] animate-float-slow delay-700">
          <Jellyfish size={140} opacity={0.45} />
        </div>
      </div>

      {/* 近景：小鱼横游 */}
      <div className="absolute inset-0">
        <div data-depth="0.35" className="absolute -left-40 bottom-[28%] animate-swim-x">
          <Fish width={180} opacity={0.65} />
        </div>
        <div
          data-depth="0.32"
          className="absolute -left-44 bottom-[48%] animate-swim-x delay-500"
          style={{ animationDuration: "42s" }}
        >
          <Fish width={140} flip opacity={0.55} />
        </div>
        <div
          data-depth="0.30"
          className="absolute -left-52 bottom-[12%] animate-swim-x delay-1000"
          style={{ animationDuration: "50s" }}
        >
          <Fish width={220} opacity={0.5} />
        </div>
      </div>

      {/* 柔光 */}
      <div
        data-depth="0.12"
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(170,210,255,0.22), rgba(0,0,20,0) 65%)" }}
      />

      <style>{css}</style>
    </div>
  );
}

function Jellyfish({ size = 140, opacity = 0.6 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={(size * 1.2) | 0} viewBox="0 0 120 150" fill="none" style={{ opacity }}>
      <defs>
        <radialGradient id="jg" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="rgba(200,230,255,0.9)" />
          <stop offset="60%" stopColor="rgba(160,190,255,0.35)" />
          <stop offset="100%" stopColor="rgba(140,170,240,0.15)" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="46" rx="42" ry="30" fill="url(#jg)" />
      <ellipse cx="60" cy="48" rx="34" ry="22" fill="rgba(255,255,255,0.25)" />
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M ${40 + i * 10} 60 C ${35 + i * 10} 90, ${55 + i * 10} 110, ${45 + i * 10} 140`}
          stroke="rgba(170,200,255,0.35)"
          strokeWidth="2"
          fill="none"
        />
      ))}
    </svg>
  );
}

function Fish({ width = 180, opacity = 0.65, flip = false }: { width?: number; opacity?: number; flip?: boolean }) {
  const h = Math.round(width * 0.42);
  return (
    <svg width={width} height={h} viewBox="0 0 220 90" fill="none" style={{ opacity, transform: flip ? "scaleX(-1)" : undefined }}>
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(160,210,255,0.85)" />
          <stop offset="100%" stopColor="rgba(120,160,255,0.55)" />
        </linearGradient>
      </defs>
      <path d="M10 45 C 45 5, 140 5, 170 45 C 140 85, 45 85, 10 45 Z" fill="url(#fg)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <path d="M170 45 L210 20 L205 45 L210 70 Z" fill="rgba(120,160,255,0.35)" />
      <circle cx="46" cy="40" r="3.2" fill="rgba(20,28,45,0.8)" />
    </svg>
  );
}

const css = `
@keyframes float-slow { 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-8px,0)} 100%{transform:translate3d(0,0,0)} }
.animate-float-slow { animation: float-slow 7.5s ease-in-out infinite; }
@keyframes swim-x { 0%{ transform: translate3d(-10vw,0,0); opacity:0 } 10%{opacity:.9} 50%{ transform: translate3d(55vw,0,0)} 80%{opacity:.9} 100%{ transform: translate3d(110vw,0,0); opacity:0 } }
.animate-swim-x { animation: swim-x 52s linear infinite; }
@media (prefers-reduced-motion: reduce) { .animate-float-slow, .animate-swim-x { animation: none !important; } }
`;
