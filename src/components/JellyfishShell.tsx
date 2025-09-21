// src/components/JellyfishShell.tsx
import React, { useEffect, useMemo, useState } from "react";

export type Period = "auto" | "morning" | "noon" | "evening" | "night";

/** 动态问候语（给父组件用） */
export function getTimeGreeting(d: Date = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "Good morning";
  if (h >= 11 && h < 16) return "Good afternoon";
  if (h >= 16 && h < 21) return "Good evening";
  return "Good night";
}

export default function JellyfishShell({
  children,
  period = "auto",
  className = "",
}: {
  children: React.ReactNode;
  period?: Period;
  className?: string;
}) {
  // 每分钟刷新一次，确保时间段能自动切换
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const resolved = useMemo<Exclude<Period, "auto">>(() => {
    if (period !== "auto") return period;
    const h = now.getHours();
    if (h >= 5 && h < 11) return "morning";
    if (h >= 11 && h < 16) return "noon";
    if (h >= 16 && h < 21) return "evening";
    return "night";
  }, [period, now]);

  // 不同时间段的配色 & 光晕
  const theme = {
    morning: {
      cap:
        "radial-gradient(140px 120px at 50% 60%, rgba(210,235,255,.75), rgba(140,180,255,.35) 60%, rgba(120,170,255,.15) 90%, rgba(255,255,255,0) 100%)",
      glow: "rgba(160,210,255,.35)",
      tentacle: "rgba(200,230,255,.35)",
      ring: "rgba(255,255,255,.45)",
    },
    noon: {
      cap:
        "radial-gradient(150px 130px at 50% 60%, rgba(255,232,210,.80), rgba(255,190,150,.40) 60%, rgba(255,170,120,.18) 90%, rgba(255,255,255,0) 100%)",
      glow: "rgba(255,205,160,.40)",
      tentacle: "rgba(255,200,160,.35)",
      ring: "rgba(255,240,220,.55)",
    },
    evening: {
      cap:
        "radial-gradient(150px 130px at 50% 60%, rgba(210,190,255,.78), rgba(170,140,255,.38) 60%, rgba(140,110,255,.16) 90%, rgba(255,255,255,0) 100%)",
      glow: "rgba(170,140,255,.35)",
      tentacle: "rgba(180,150,255,.30)",
      ring: "rgba(235,220,255,.5)",
    },
    night: {
      cap:
        "radial-gradient(150px 130px at 50% 60%, rgba(150,200,255,.22), rgba(120,170,255,.12) 60%, rgba(60,90,180,.10) 90%, rgba(255,255,255,0) 100%)",
      glow: "rgba(120,200,180,.22)",
      tentacle: "rgba(120,220,200,.28)",
      ring: "rgba(180,220,255,.35)",
    },
  }[resolved];

  return (
    <div className={`relative w-full max-w-sm mx-auto ${className}`}>
      {/* 水母整体漂浮 */}
      <div className="relative animate-jelly-float">
        {/* 伞盖 */}
        <div
          className="relative mx-auto w-64 h-52 rounded-[110px_110px_60px_60px/110px_110px_50px_50px] backdrop-blur-xl"
          style={{
            background: theme.cap,
            border: `1px solid ${theme.ring}`,
            boxShadow:
              "inset 0 10px 40px rgba(255,255,255,.35), inset 0 -20px 40px rgba(0,0,30,.25), 0 30px 80px rgba(0,0,0,.35)",
          }}
        >
          {/* 高光 */}
          <div className="absolute left-8 top-6 w-10 h-10 rounded-full opacity-80 blur-md bg-white" />
          {/* 外发光 */}
          <div
            className="absolute -inset-8 rounded-full blur-3xl"
            style={{ backgroundColor: theme.glow }}
          />
        </div>

        {/* 触手（简单 6 条） */}
        <div className="relative -mt-2 flex justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="block w-1.5 h-24 rounded-full opacity-80 animate-tentacle"
              style={{
                background: `linear-gradient(180deg, ${theme.tentacle}, rgba(255,255,255,0))`,
                transformOrigin: "top center",
                animationDelay: `${i * 0.18}s`,
                filter: "drop-shadow(0 0 6px rgba(255,255,255,.25))",
              }}
            />
          ))}
        </div>

        {/* 内容槽：放你的卡片 */}
        <div className="relative -mt-12 px-4 pb-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,.35)]">
            {children}
          </div>
        </div>
      </div>

      {/* 局部样式：动画 */}
      <style>{`
        @keyframes jellyFloat {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
        .animate-jelly-float {
          animation: jellyFloat 5.5s ease-in-out infinite;
        }
        @keyframes tentacle {
          0% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(4.5deg) translateY(1px); }
          100% { transform: rotate(0deg) translateY(0); }
        }
        .animate-tentacle {
          animation: tentacle 3.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
