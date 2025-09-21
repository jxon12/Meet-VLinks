// src/features/pet/ui.tsx
import React from "react";

export function Card({ children, className="" }: React.PropsWithChildren<{className?:string}>) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children }: React.PropsWithChildren) {
  return <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 border border-white/15">{children}</span>;
}

export function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] text-white/70">{label}</div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
        <div className="h-full bg-gradient-to-r from-[#E1B3FF] to-[#96B4FF]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
