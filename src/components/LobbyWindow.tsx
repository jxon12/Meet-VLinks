// src/components/LobbyWindow.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, DoorOpen, Users, MapPin, Mic, Video } from "lucide-react";

type Room = {
  id: string;
  name: string;
  cap: number;
  base: number; // 初始在线数
};

export default function LobbyWindow({
  onBack,
}: {
  onBack: () => void;
}) {
  const [joined, setJoined] = useState(false);
  const [active, setActive] = useState<string>("ocean");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const tickRef = useRef<number | null>(null);

  // 你的房间（可改名/增删）
  const rooms: Room[] = useMemo(
    () => [
      { id: "ocean", name: "Ocean Office", cap: 16, base: 6 },
      { id: "pair", name: "Pair Pods", cap: 6, base: 2 },
      { id: "chill", name: "Chill Lounge", cap: 10, base: 3 },
      { id: "med", name: "Meditation Room", cap: 8, base: 1 },
    ],
    []
  );

  // 初始化在线人数
  useEffect(() => {
    const init: Record<string, number> = {};
    rooms.forEach((r) => (init[r.id] = r.base));
    setCounts(init);
  }, [rooms]);

  // 小幅抖动“在线人数”，营造在线感
  useEffect(() => {
    if (!joined) return;
    tickRef.current = window.setInterval(() => {
      setCounts((prev) => {
        const next = { ...prev };
        rooms.forEach((r) => {
          const delta = Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? -1 : 1);
          const v = Math.max(0, Math.min(r.cap, (prev[r.id] ?? 0) + delta));
          next[r.id] = v;
        });
        return next;
      });
    }, 1800);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [joined, rooms]);

  return (
    <div className="relative h-full w-full text-white">
      {/* 顶部栏 */}
      <div className="absolute top-0 inset-x-0 z-20 h-14 px-4 sm:px-6 flex items-center gap-3 border-b border-white/10 bg-black/20 backdrop-blur">
        <button
          onClick={onBack}
          className="rounded-full p-2 bg-white/10 border border-white/20 hover:bg-white/15 backdrop-blur"
          aria-label="Back"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-sm tracking-[0.25em]">LOBBY</div>
      </div>

      {/* 内容区 */}
      <div className="absolute inset-0 pt-14">
        {!joined ? (
          <DoorScreen onOpen={() => setJoined(true)} />
        ) : (
          <MainScreen
            rooms={rooms}
            counts={counts}
            active={active}
            onPick={setActive}
          />
        )}
      </div>
    </div>
  );
}

/* ============== 开门页 ============== */
function DoorScreen({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="h-full w-full grid place-items-center">
      <div className="relative w-[min(88vw,420px)]">
        {/* “门” */}
        <div className="rounded-[28px] p-[10px] bg-[rgba(255,255,255,0.08)] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
          <div className="relative h-[520px] rounded-[22px] border border-white/12 bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
            <div className="absolute inset-0 mx-auto w-px bg-white/15" />
            <div className="absolute inset-0 opacity-40 pointer-events-none"
                 style={{ background: "radial-gradient(120px 120px at 50% 40%, rgba(255,255,255,0.35), transparent 65%)" }} />
            <div className="absolute inset-0 overflow-hidden">
              {/* 星点 */}
              {[...Array(24)].map((_, i) => (
                <span key={i} className="absolute w-1 h-1 bg-white/40 rounded-full"
                  style={{
                    left: `${8 + Math.random() * 84}%`,
                    top: `${8 + Math.random() * 84}%`,
                    animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 1.5}s infinite`,
                  }} />
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-24 text-center">
              <p className="text-white/85 mb-4">Ready to connect?</p>
              <button
                onClick={onOpen}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black border border-white/20 hover:bg-white/90"
              >
                <DoorOpen className="w-5 h-5" />
                Open the Door
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 局部样式 */}
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.25; transform:scale(.9)} 50%{opacity:.8; transform:scale(1.1)}}
      `}</style>
    </div>
  );
}

/* ============== 主界面（左侧房间，右侧地图格子） ============== */
function MainScreen({
  rooms,
  counts,
  active,
  onPick,
}: {
  rooms: Room[];
  counts: Record<string, number>;
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* 左：侧栏 */}
      <aside className="h-full bg-black/25 border-r border-white/10 p-4 sm:p-5 space-y-4 overflow-y-auto">
        {/* Rooms */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="px-4 py-3 text-sm text-white/80 border-b border-white/10 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Rooms
          </div>
          <div className="p-2 space-y-2">
            {rooms.map((r) => {
              const selected = r.id === active;
              const cur = counts[r.id] ?? 0;
              return (
                <button
                  key={r.id}
                  onClick={() => onPick(r.id)}
                  className={`w-full text-left px-3 py-3 rounded-xl border transition
                    ${selected ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-white/70 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {cur}/{r.cap}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Device controls（占位） */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/80">Device controls</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm inline-flex items-center gap-1">
                <Mic className="w-4 h-4" /> Mic Off
              </button>
              <button className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-sm inline-flex items-center gap-1">
                <Video className="w-4 h-4" /> Cam Off
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/60">Placeholder only (front-end demo).</p>
        </section>

        {/* 小提示 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 text-sm text-white/80">
          Tip: After you pick a room, the map on the right can load that area.  
          We’ll embed Gather here later.
        </section>
      </aside>

      {/* 右：地图格子 */}
      <main className="relative h-full">
        {/* 占位格：以后把 iframe 放这里 */}
        <div className="absolute inset-0 p-4 sm:p-6">
          <div className="h-full w-full rounded-2xl border-2 border-dashed border-white/15 bg-black/20 grid place-items-center">
            <div className="text-center">
              <div className="text-white/85 mb-1">Map Space</div>
              <p className="text-white/60 text-sm max-w-sm">
                This is a placeholder. Drop a <code>&lt;iframe&gt;</code> to Gather here (Meeting view).
              </p>
            </div>
          </div>
        </div>

        {/* 示例：以后接入 Gather（留作参考，暂时注释）
        <iframe
          title="Gather Map"
          src="https://app.gather.town/app/<YOUR_SPACE_ID>/<YOUR_MAP_ID>?spawnToken=<OPTIONAL>"
          className="absolute inset-0 w-full h-full rounded-2xl border-0"
          allow="camera; microphone; fullscreen; display-capture"
        />
        */}
      </main>
    </div>
  );
}
