import React, { useMemo, useState } from "react";
import { MessageCircle, Sparkles, Headphones, Wind, BookOpen, Shield, Trophy, Landmark } from "lucide-react";

const moods = [
  { k: "calm", label: "Calm" },
  { k: "focus", label: "Focus" },
  { k: "connect", label: "Connect" },
] as const;

function GlassCard({ children, className = "", onClick }: {children: React.ReactNode; className?:string; onClick?:()=>void}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl p-4 border border-white/12 bg-white/8 backdrop-blur-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.06)] hover:bg-white/12 active:scale-[.99] transition ${className}`}
    >
      {children}
    </button>
  );
}

export default function Explore({ onOpenAI }: { onOpenAI?: () => void }) {
  const [filter, setFilter] = useState<"calm"|"focus"|"connect">("calm");

  const title = useMemo(() => {
    if (filter === "calm") return "A softer day starts here";
    if (filter === "focus") return "Find your gentle focus";
    return "Small steps to feel connected";
  }, [filter]);

  return (
    <div className="min-h-screen text-white relative bg-gradient-to-b from-[#060c19] via-[#0a162b] to-[#02060c]">
      {/* 顶栏 */}
      <div className="sticky top-0 z-30 h-14 px-4 flex items-center justify-between backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="font-semibold tracking-[0.18em]">EXPLORE</div>
        <button onClick={onOpenAI} className="rounded-full p-2 border border-white/20 bg-white/5">
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Mood 选择 */}
      <div className="px-4 pt-4">
        <h2 className="text-lg font-medium text-white/90 mb-3">{title}</h2>
        <div className="flex gap-2">
          {moods.map(m => (
            <button
              key={m.k}
              onClick={()=>setFilter(m.k)}
              className={`px-3 py-1.5 rounded-full text-sm border ${filter===m.k ? "bg-white text-black border-white" : "bg-white/8 border-white/15 text-white/80"} backdrop-blur`}
            >{m.label}</button>
          ))}
        </div>
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-1 gap-3 px-4 py-4 pb-24">
        <GlassCard onClick={()=>{}} className="bg-gradient-to-br from-[#6ea7ff1a] to-[#b28bff1a]">
          <div className="flex items-center gap-3">
            <Wind className="w-5 h-5" />
            <div className="font-medium">Breathing • 4-7-8</div>
          </div>
          <p className="text-sm text-white/70 mt-1">Tap to enter a 60s guided breath.</p>
        </GlassCard>

        <GlassCard onClick={()=>{}} className="bg-gradient-to-br from-[#9ad9ff1a] to-[#6ea7ff1a]">
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5" />
            <div className="font-medium">Ocean white-noise</div>
          </div>
          <p className="text-sm text-white/70 mt-1">Ambient sea, helps you settle in.</p>
        </GlassCard>

        <GlassCard onClick={()=>{}} className="bg-gradient-to-br from-[#b28bff1a] to-[#ffb3d41a]">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <div className="font-medium">Micro lesson • 45s</div>
          </div>
          <p className="text-sm text-white/70 mt-1">Reframe “all-or-nothing” studying.</p>
        </GlassCard>

        {/* 校园资源四宫格 */}
        <GlassCard className="bg-gradient-to-br from-[#76e3c81a] to-[#9ad9ff1a]">
          <div className="font-medium mb-3">Campus resources</div>
          <div className="grid grid-cols-4 gap-2 text-xs text-white/80">
            <button className="rounded-xl border border-white/15 bg-white/8 p-3 grid place-items-center gap-1"><Shield className="w-4 h-4"/><span>Counsel</span></button>
            <button className="rounded-xl border border-white/15 bg-white/8 p-3 grid place-items-center gap-1"><Landmark className="w-4 h-4"/><span>Hotline</span></button>
            <button className="rounded-xl border border-white/15 bg-white/8 p-3 grid place-items-center gap-1"><Sparkles className="w-4 h-4"/><span>Events</span></button>
            <button className="rounded-xl border border-white/15 bg-white/8 p-3 grid place-items-center gap-1"><BookOpen className="w-4 h-4"/><span>Guides</span></button>
          </div>
        </GlassCard>

        <GlassCard onClick={()=>{}} className="bg-gradient-to-br from-[#ffd29a1a] to-[#ffb3d41a]">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5" />
            <div className="font-medium">7-day sleep challenge</div>
          </div>
          <p className="text-sm text-white/70 mt-1">Tiny steps to wind down better.</p>
        </GlassCard>

        <GlassCard onClick={()=>{}} className="bg-gradient-to-br from-[#6ea7ff1a] to-[#76e3c81a]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div className="font-medium">Today’s picks for you</div>
          </div>
          <p className="text-sm text-white/70 mt-1">Based on your mood & saves.</p>
        </GlassCard>
      </div>
    </div>
  );
}
