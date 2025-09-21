// components/AppIcon.tsx
import React from "react";

export function AppIcon({
  title, emoji,
}: { title: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="
        w-14 h-14 rounded-2xl
        bg-white/30 backdrop-blur-2xl
        border border-white/40 ring-1 ring-white/30
        shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_24px_rgba(0,0,0,0.12)]
        flex items-center justify-center text-2xl
        transition-transform hover:scale-[1.04] active:scale-95
      ">
        <span>{emoji}</span>
      </div>
      <div className="text-[11px] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
        {title}
      </div>
    </div>
  );
}
