// src/Game.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { askGeminiMulti, type BuddyInfo } from "../lib/gemini";

/* =========================
   Types
========================= */
type Stat = { hunger: number; thirst: number; clean: number; mood: number; affinity: number };
type BuddyId = "Louise" | "Skylar" | "Luther" | "Joshua";
type Buddy = { id: BuddyId; name: string; species: string; tagline: string };

type Plot =
  | "settle_in" | "walk" | "explore" | "share_snack" | "brainstorm"
  | "stargaze" | "craft" | "festival_prep" | "help_someone"
  | "small_misunderstanding" | "cool_off" | "team_up" | "mini_goal";

type JournalEntry = { id: string; ts: number; pov: BuddyId; with: BuddyId; plot: Plot; text: string };
type StoryMeta = { season: number; chapter: number; step: number };
type Props = { onExit: () => void; onLive?: (text: string) => void };

/* =========================
   Data
========================= */
const BUDDIES: Record<BuddyId, Buddy> = {
  Louise: { id: "Louise", name: "Louise", species: "Jellyfish",    tagline: "Calm and lucky" },
  Skylar: { id: "Skylar", name: "Skylar", species: "Dumbo Octopus", tagline: "Creative guardian" },
  Luther: { id: "Luther", name: "Luther", species: "Whale",         tagline: "Emotional balance" },
  Joshua: { id: "Joshua", name: "Joshua", species: "Turtle",        tagline: "Energetic support" },
};

/* Theme */
const THEME: Record<BuddyId, { bg: string; chip: string; text: string; glow: string }> = {
  Louise: { bg: "linear-gradient(180deg,#e7fff9,#c6f6ea)", chip: "#39c3a5", text: "#05362b", glow: "0 10px 28px rgba(57,195,165,.35)" },
  Skylar: { bg: "linear-gradient(180deg,#fff7e8,#ffe2ad)", chip: "#f2b83f", text: "#3a2b06", glow: "0 10px 28px rgba(242,184,63,.35)" },
  Luther: { bg: "linear-gradient(180deg,#e8f4ff,#cbe7ff)", chip: "#4aa7f1", text: "#0a1b2a", glow: "0 10px 28px rgba(74,167,241,.35)" },
  Joshua: { bg: "linear-gradient(180deg,#f7ffe8,#e2ffc2)", chip: "#66c24a", text: "#13360a", glow: "0 10px 28px rgba(102,194,74,.35)" },
};

const TOP_PAD = 92;
const MAX_JOURNAL = 400; // 保护本地存储尺寸

const LS = {
  buddy: "pet.buddy.story.v13",
  stats: "pet.stats.story.v13",
  diary: "pet.diary.story.v13",
  meta:  "pet.storymeta.v13"
};

function load<T>(k: string, fb: T): T { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : fb; } catch { return fb; } }
function save<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/* =========================
   Story Arc
========================= */
type Chapter = { name: string; beats: Plot[] };
const SEASONS: Chapter[][] = [
  [
    { name: "Settling In",  beats: ["settle_in","share_snack","walk","mini_goal"] },
    { name: "Curious Tide", beats: ["explore","help_someone","stargaze","brainstorm"] },
    { name: "Small Projects", beats: ["craft","team_up","festival_prep","mini_goal"] },
  ],
  [
    { name: "Preparations", beats: ["festival_prep","team_up","help_someone","mini_goal"] },
    { name: "A Tiny Hiccup", beats: ["small_misunderstanding","cool_off","share_snack","team_up"] },
    { name: "Night Lights",  beats: ["stargaze","explore","craft","mini_goal"] },
  ],
];

/* =========================
   Pixel Buddy (12×12)
========================= */
function BuddySprite({ id, size = 96 }: { id: BuddyId; size?: number }) {
  const px = 12, s = size / px;
  const C = {
    Louise: { base: "#7CE5CF", accent: "#125247", detail: "#A8F2E5" },
    Skylar: { base: "#FFC766", accent: "#3B2D09", detail: "#FFE4A0" },
    Luther: { base: "#6EC3FF", accent: "#0E2940", detail: "#BDE3FF" },
    Joshua: { base: "#6BC76B", accent: "#1F3A1F", detail: "#A6E5A6" },
  }[id];

  const body: [number, number][][] = [
    // Louise – Jellyfish
    [[4,2],[5,2],[6,2],[7,2],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[4,5],[5,5],[6,5],[7,5],[4,6],[6,6],[7,6],[4,7],[6,7],[7,7]],
    // Skylar – Dumbo Octopus
    [[5,2],[6,2],[4,3],[5,3],[6,3],[7,3],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[3,5],[8,5],[4,6],[5,6],[6,6],[7,6]],
    // Luther – Whale
    [[3,3],[4,3],[5,3],[6,3],[7,3],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[3,6],[4,6],[5,6],[4,7],[5,7]],
    // Joshua – Turtle
    [[4,3],[5,3],[6,3],[3,4],[4,4],[5,4],[6,4],[7,4],[3,5],[4,5],[5,5],[6,5],[7,5],[4,6],[5,6],[6,6],[2,4],[3,6],[7,6]],
  ];
  const idx = { Louise: 0, Skylar: 1, Luther: 2, Joshua: 3 }[id];
  const face: [number, number][][] = [ [[5,4],[6,4]], [[5,4],[6,4]], [[4,4],[6,4]], [[5,4],[6,4]] ];

  return (
    <div className="sprite-float">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ imageRendering: "pixelated" }}>
        {body[idx].map(([x,y], i) => <rect key={i} x={x*s} y={y*s} width={s} height={s} fill={C.base} />)}
        {face[idx].map(([x,y], i) => <rect key={`f${i}`} x={x*s} y={y*s} width={s} height={s} fill={C.accent} />)}
        <rect x={4*s} y={3*s} width={s} height={s} fill={C.detail} />
        <rect x={7*s} y={3*s} width={s} height={s} fill={C.detail} />
      </svg>
    </div>
  );
}

/* =========================
   UI bits
========================= */
function GlassCard({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="rounded-2xl" style={{
      background: "rgba(255,255,255,.55)",
      border: "1px solid rgba(0,0,0,.06)",
      boxShadow: "0 10px 28px rgba(40,60,90,.18)",
      backdropFilter: "blur(10px) saturate(140%)",
    }}>
      {children}
    </div>
  );
}
function StatBar({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  const v = Math.max(0, Math.min(100, value));
  const tone =
    v >= 75 ? "linear-gradient(90deg,#56f39a,#67d6ff)" :
    v >= 40 ? "linear-gradient(90deg,#ffd36e,#ffab4a)" :
              "linear-gradient(90deg,#ff7a7a,#ff477e)";
  return (
    <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,.66)", border: "1px solid rgba(0,0,0,.06)" }}>
      <div className="flex items-center justify-between text-[13px] mb-1.5">
        <div className="opacity-80">{emoji} {label}</div>
        <div className="font-medium">{v}</div>
      </div>
      <div className="h-2.5 w-full rounded-full bg-black/8 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: tone, boxShadow: "0 8px 18px rgba(0,0,0,.12) inset" }} />
      </div>
    </div>
  );
}
function ActionButton({ text, onClick, color, dataAct }: { text: string; onClick: () => void; color: string; dataAct?: string }) {
  return (
    <button
      data-act={dataAct}
      onClick={onClick}
      className="relative px-3 py-2 rounded-lg text-white font-medium select-none"
      style={{
        background: `linear-gradient(180deg, ${color}, ${shade(color, -12)})`,
        boxShadow: "0 10px 24px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.35)",
        border: "1px solid rgba(255,255,255,.25)",
      }}
    >
      {text}
    </button>
  );
}
function shade(hex: string, p: number) {
  const n = Math.max(-100, Math.min(100, p)) / 100;
  const [r,g,b] = [hex.slice(1,3),hex.slice(3,5),hex.slice(5,7)].map(h=>parseInt(h,16));
  const m = (x:number)=>Math.round(x + (n<0 ? x*n : (255-x)*n));
  const to = (x:number)=>x.toString(16).padStart(2,"0");
  return `#${to(m(r))}${to(m(g))}${to(m(b))}`;
}
function burstAt(el: HTMLElement, emoji = "✨") {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i=0;i<10;i++){
    const s = document.createElement("div");
    s.textContent = emoji;
    s.style.position = "fixed";
    s.style.left = `${cx}px`; s.style.top = `${cy}px`;
    s.style.transform = `translate(-50%,-50%) scale(${0.9+Math.random()*0.6})`;
    s.style.pointerEvents = "none";
    s.style.zIndex = "2000";
    s.style.filter = "drop-shadow(0 2px 2px rgba(0,0,0,.2))";
    document.body.appendChild(s);
    const dx = (Math.random()-.5)*160;
    const dy = (Math.random()-.8)*160;
    s.animate(
      [{ opacity: 1, transform: s.style.transform },
       { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.8)` }],
      { duration: 720 + Math.random()*260, easing: "cubic-bezier(.2,.9,.2,1)" }
    ).onfinish = () => s.remove();
  }
}

/* Live Island */
function LiveCapsule({ text, onToggle }: { text: string; onToggle: () => void }) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <button
        onClick={onToggle}
        className="w-[140px] h-[34px] rounded-[22px] pointer-events-auto"
        style={{ background:"rgba(0,0,0,.88)", boxShadow:"0 10px 28px rgba(0,0,0,.45), 0 0 0 0.5px rgba(255,255,255,.06) inset" }}
        aria-label="Live Island"
        title="Live Island"
      />
      {text && (
        <div className="mt-2 w-[280px] rounded-2xl px-3 py-2 mx-auto text-white pointer-events-auto"
             style={{ background:"rgba(20,24,34,.62)", border:"1px solid rgba(255,255,255,.18)", backdropFilter:"blur(18px) saturate(140%)", boxShadow:"0 18px 48px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.35)" }}>
          <div className="text-sm">{text}</div>
        </div>
      )}
    </div>
  );
}

/* BottomSheet（支持 bodyRef） */
function BottomSheet({
  title, open, onClose, children, bodyRef,
}: React.PropsWithChildren<{
  title: string; open: boolean; onClose: () => void; bodyRef?: React.Ref<HTMLDivElement>;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const deltaY = useRef(0);

  function start(e: React.TouchEvent | React.MouseEvent) {
    dragging.current = true;
    startY.current = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    deltaY.current = 0;
    if (ref.current) ref.current.style.transition = "none";
  }
  function move(e: React.TouchEvent | React.MouseEvent) {
    if (!dragging.current) return;
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    deltaY.current = Math.max(0, y - startY.current);
    if (ref.current) ref.current.style.transform = `translateY(${deltaY.current}px)`;
  }
  function end() {
    if (!dragging.current) return;
    dragging.current = false;
    if (ref.current) ref.current.style.transition = "transform 180ms ease";
    if (deltaY.current > 120) onClose();
    else if (ref.current) ref.current.style.transform = "translateY(0)";
  }
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={ref}
        className="absolute left-0 right-0 bottom-0 rounded-t-2xl bg-white text-black shadow-2xl"
        onMouseDown={start as any} onMouseMove={move as any} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start as any} onTouchMove={move as any} onTouchEnd={end}
        style={{ transform: "translateY(0)", transition: "transform 180ms ease", height: "72vh", maxHeight: "100vh" }}
      >
        <div className="pt-2 pb-3 border-b border-black/10 flex items-center justify-between">
          <div className="mx-4 w-12 h-1.5 rounded-full bg-black/15" />
          <div className="px-4 font-medium flex-1">{title}</div>
          <button onClick={onClose} className="px-2 py-1 rounded-md border border-black/10 bg-black/5 text-sm">Close</button>
        </div>
        <div ref={bodyRef as any} className="p-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 56px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main
========================= */
export default function Game({ onExit, onLive }: Props) {
  const [buddy, setBuddy] = useState<Buddy | null>(load<Buddy | null>(LS.buddy, null));
  const [stats, setStats] = useState<Stat>(load(LS.stats, { hunger: 80, thirst: 80, clean: 80, mood: 80, affinity: 60 }));
  const [journal, setJournal] = useState<JournalEntry[]>(load(LS.diary, []));
  const [meta, setMeta] = useState<StoryMeta>(load(LS.meta, { season: 0, chapter: 0, step: 0 }));
  const [showDiary, setShowDiary] = useState(false);

  // Journal 可见数量（分页）
  const [visibleCount, setVisibleCount] = useState(20);
  const listRef = useRef<HTMLDivElement>(null);

  const [islandOpen, setIslandOpen] = useState(true);
  const [islandText, setIslandText] = useState("");

  useEffect(() => { if (buddy) save(LS.buddy, buddy); }, [buddy]);
  useEffect(() => { save(LS.stats, stats); }, [stats]);
  useEffect(() => { save(LS.diary, journal); }, [journal]);
  useEffect(() => { save(LS.meta, meta); }, [meta]);

  // 打开 Journal 时，滚到最上方（最新）
  useEffect(() => {
    if (showDiary) {
      setVisibleCount(20);
      setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "instant" as any }), 0);
    }
  }, [showDiary, buddy]);

  const theme = useMemo(() => THEME[(buddy?.id || "Luther") as BuddyId], [buddy]);
  function pushLive(t: string) { setIslandText(t); onLive?.(t); }

  /* -------- Actions -------- */
  function act(a: "feed" | "water" | "clean" | "play") {
    if (!buddy) return;
    const next = { ...stats };
    if (a === "feed")  { next.hunger = Math.min(100, next.hunger + 15); next.mood = Math.min(100, next.mood + 5); pushLive(`${buddy.name} enjoyed a snack 🍪`); }
    if (a === "water") { next.thirst = Math.min(100, next.thirst + 15); next.clean = Math.max(0, next.clean - 2); pushLive(`${buddy.name} drank water 💧`); }
    if (a === "clean") { next.clean = Math.min(100, next.clean + 20); next.mood = Math.min(100, next.mood + 3); pushLive(`${buddy.name} took a bath 🛁`); }
    if (a === "play")  { next.mood = Math.min(100, next.mood + 12); next.affinity = Math.min(100, next.affinity + 8); pushLive(`You played with ${buddy.name} 🎲`); }
    setStats(next);
    scheduleStory("after_action");
    const btn = document.querySelector<HTMLButtonElement>(`button[data-act='${a}']`); if (btn) burstAt(btn, a==="play" ? "🎉" : a==="clean" ? "🫧" : a==="feed" ? "🍪" : "💧");
  }

  /* -------- Story Engine -------- */
  const storyTimer = useRef<number | null>(null);
  const lastKick = useRef(0);

  useEffect(() => {
    scheduleStory("opening", 1800);
    storyTimer.current = window.setInterval(() => scheduleStory("heartbeat"), 75_000);
    return () => { if (storyTimer.current) clearInterval(storyTimer.current); };
  }, []);

  function scheduleStory(reason: "opening" | "heartbeat" | "after_action", delay = 1200) {
    const now = Date.now();
    if (reason !== "after_action" && now - lastKick.current < 25_000) return;
    lastKick.current = now;
    setTimeout(() => void generateStory(reason), delay);
  }

  function currentChapter(metaX = meta): Chapter {
    const season = SEASONS[metaX.season % SEASONS.length];
    return season[metaX.chapter % season.length];
  }

  function nextPlot(): Plot {
    // 先取当前章节及节拍
    const ch = currentChapter();
    const plot = ch.beats[meta.step % ch.beats.length];

    // 推进 meta
    setMeta((m) => {
      const seasonArr = SEASONS[m.season % SEASONS.length];
      const stepNext = m.step + 1;
      const wrapBeat = stepNext % ch.beats.length === 0;
      let season = m.season;
      let chapter = m.chapter;
      let step = stepNext;

      if (wrapBeat) {
        chapter += 1;
        step = 0;
        if (chapter >= seasonArr.length) {
          chapter = 0;
          season = (season + 1) % SEASONS.length;
        }
      }
      return { season, chapter, step };
    });

    return plot;
  }

  function pickPair(): [BuddyId, BuddyId] {
    const ids = Object.keys(BUDDIES) as BuddyId[];
    const pov = buddy ? buddy.id : rand(ids);
    let withId = rand(ids.filter(i => i !== pov));
    const last = journal.find(j => j.pov === pov);
    if (last && Math.random() < 0.35) withId = last.with;
    return [pov, withId];
  }

  async function generateStory(reason: string) {
    const [pov, withId] = pickPair();
    const povInfo = BUDDIES[pov];
    const withInfo = BUDDIES[withId];
    const plot = nextPlot();

    const recent = journal
      .filter(j => (j.pov === pov && j.with === withId) || (j.pov === withId && j.with === pov))
      .slice(0, 6)
      .map(e => `- ${BUDDIES[e.pov].name} & ${BUDDIES[e.with].name}: ${e.plot} -> ${e.text}`)
      .join("\n");

    const arcName = currentChapter().name;
    const sys = `You write a cozy, logical diary from a buddy's first-person perspective.
Keep continuity with recent events and the chapter theme.
Avoid repetitive conflict; if any tension appears, it is brief and gentle.
Write 1–3 short sentences (<= 40 words total). No emojis.`;

    const prompt = `
${sys}
[Reason] ${reason}
[Season] ${meta.season + 1}
[Chapter] ${arcName}
[Beat/Plot] ${plot}
[POV] ${povInfo.name} (${povInfo.species})
[Partner] ${withInfo.name} (${withInfo.species})
[Recent context]
${recent || "(none)"}
[Constraints]
- First person voice from ${povInfo.name}.
- Mention ${withInfo.name} naturally.
- End with a small feeling or intention tied to the chapter theme.
`.trim();

    try {
      const out = await askGeminiMulti(prompt, { id: "buddy-diary", name: "Diary", persona: "gentle" } as BuddyInfo);
      const text = (out && out[0]) || `${povInfo.name} spent time with ${withInfo.name}. It fit our chapter: ${arcName}.`;
      const entry: JournalEntry = { id: crypto.randomUUID(), ts: Date.now(), pov, with: withId, plot, text };
      setJournal((j) => {
        const next = [entry, ...j];
        return next.length > MAX_JOURNAL ? next.slice(0, MAX_JOURNAL) : next;
      });
      pushLive(`${povInfo.name} · ${plot} with ${withInfo.name}`);
    } catch {
      const fallback = `${povInfo.name} and ${withInfo.name} continued the ${arcName.toLowerCase()} chapter (${plot}). It felt right.`;
      const entry: JournalEntry = { id: crypto.randomUUID(), ts: Date.now(), pov, with: withId, plot, text: fallback };
      setJournal((j) => {
        const next = [entry, ...j];
        return next.length > MAX_JOURNAL ? next.slice(0, MAX_JOURNAL) : next;
      });
      pushLive(`${povInfo.name} · ${plot} with ${withInfo.name}`);
    }
  }

  /* -------- Adopt Screen -------- */
  if (!buddy) {
    const theme0 = THEME.Luther;
    return (
      <div className="relative w-full h-full overflow-hidden" style={{ background: theme0.bg, color: theme0.text }}>
        <BackgroundDecor />
        <LiveCapsule text={islandOpen ? islandText : ""} onToggle={() => setIslandOpen(v => !v)} />
        <button onClick={onExit} className="fixed right-3 top-3 z-[1300] h-9 w-9 grid place-items-center rounded-full bg-black/85 text-white" title="Exit">✕</button>

        <div className="absolute inset-0 overflow-y-auto">
          <div style={{ height: TOP_PAD }} />
          <div className="px-6 pb-12">
            <div className="max-w-md mx-auto">
              <GlassCard>
                <div className="p-5">
                  <h1 className="text-[18px] font-semibold mb-1">Choose your buddy</h1>
                  <p className="text-[13px] opacity-75 mb-4">Adopt one companion to start your tiny aquarium.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {(Object.keys(BUDDIES) as BuddyId[]).map((id) => {
                      const b = BUDDIES[id];
                      return (
                        <button
                          key={id}
                          onClick={() => { setBuddy(b); setIslandOpen(true); pushLive(`Adopted ${b.name} the ${b.species}`); }}
                          className="p-4 rounded-xl text-left group"
                          style={{ background:"rgba(255,255,255,.72)", border:"1px solid rgba(0,0,0,.06)", boxShadow: THEME[id].glow }}
                        >
                          <div className="flex items-center justify-center mb-2"><BuddySprite id={id} size={92} /></div>
                          <div className="font-semibold text-[15px]">{b.name}</div>
                          <div className="text-[12px] opacity-70">{b.species}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
        <StyleBlock />
      </div>
    );
  }

  /* -------- Main Screen -------- */
  const journalForBuddy = journal.filter(e => e.pov === buddy.id);
  const slice = journalForBuddy.slice(0, visibleCount);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
      <BackgroundDecor />
      <LiveCapsule text={islandOpen ? islandText : ""} onToggle={() => setIslandOpen(v => !v)} />
      <button onClick={onExit} className="fixed right-3 top-3 z-[1300] h-9 w-9 grid place-items-center rounded-full bg-black/85 text-white" title="Exit">✕</button>

      <div className="absolute inset-0 overflow-y-auto">
        <div style={{ height: TOP_PAD }} />

        {/* Header */}
        <div className="px-6">
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl px-4 py-4 flex items-center gap-4"
                 style={{ background:"rgba(255,255,255,.55)", border:"1px solid rgba(0,0,0,.06)", boxShadow: theme.glow, backdropFilter:"blur(10px) saturate(140%)" }}>
              <div className="w-20 h-20 grid place-items-center rounded-2xl" style={{ background:"rgba(255,255,255,.55)", border:"1px solid rgba(0,0,0,.06)" }}>
                <BuddySprite id={buddy.id} size={64} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold">{buddy.name}</div>
                <div className="text-[12px] opacity-70">{buddy.species} · {buddy.tagline}</div>
                <div className="text-[12px] mt-1 opacity-80">{moodLine(stats)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 mt-4">
          <div className="max-w-md mx-auto grid grid-cols-2 gap-2">
            <StatBar label="Hunger" value={stats.hunger} emoji="🍖" />
            <StatBar label="Thirst" value={stats.thirst} emoji="💧" />
            <StatBar label="Clean"  value={stats.clean}  emoji="🧼" />
            <StatBar label="Mood"   value={stats.mood}   emoji="😊" />
            <div className="col-span-2"><StatBar label="Affinity" value={stats.affinity} emoji="❤️" /></div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 mt-5">
          <div className="max-w-md mx-auto flex flex-wrap gap-10">
            <ActionButton text="Feed"  onClick={()=>act("feed")}  color={THEME[buddy.id].chip} dataAct="feed" />
            <ActionButton text="Water" onClick={()=>act("water")} color={THEME[buddy.id].chip} dataAct="water" />
            <ActionButton text="Clean" onClick={()=>act("clean")} color={THEME[buddy.id].chip} dataAct="clean" />
            <ActionButton text="Play"  onClick={()=>act("play")}  color={THEME[buddy.id].chip} dataAct="play" />
            <button onClick={()=> setShowDiary(true)}
              className="px-3 py-2 rounded-lg text-white"
              style={{ background:"#6b6bff", boxShadow:"0 10px 24px rgba(60,60,255,.25)", border:"1px solid rgba(255,255,255,.35)" }}>
              Journal
            </button>
          </div>
        </div>

        <div style={{ height: 28 }} />
      </div>

      {/* Journal */}
      <BottomSheet title="Journal" open={showDiary} onClose={() => setShowDiary(false)} bodyRef={listRef}>
        <div className="text-[12px] opacity-70 mb-2">
          Season {meta.season + 1} · Chapter {meta.chapter + 1}: <strong>{currentChapter().name}</strong>
          {journalForBuddy.length > 0 && (
            <button
              onClick={() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="ml-3 px-2 py-0.5 rounded-full border border-black/15 text-[11px] hover:bg-black/5"
            >
              Jump to latest
            </button>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {journalForBuddy.length === 0 && <div className="opacity-70">No entries yet. They’ll appear soon.</div>}

          {slice.map(e => (
            <div key={e.id} className="px-3 py-2 rounded-lg"
                 style={{ background:"rgba(0,0,0,.04)", border:"1px solid rgba(0,0,0,.06)" }}>
              <div className="text-[12px] opacity-60 mb-1">
                {new Date(e.ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
                {" · with "}{BUDDIES[e.with].name}{" · "}{e.plot}
              </div>
              <div className="text-[14px]">{e.text}</div>
            </div>
          ))}

          {visibleCount < journalForBuddy.length && (
            <div className="pt-2 pb-1 flex justify-center">
              <button
                onClick={() => setVisibleCount(v => v + 20)}
                className="px-3 py-1 rounded-lg border border-black/15 bg-black/5 text-[13px]"
              >
                Load older…
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      <StyleBlock />
    </div>
  );
}

/* =========================
   Helpers & Visual
========================= */
function moodLine(s: Stat) {
  if (s.mood >= 85 && s.clean >= 70) return "Feels cozy and buoyant today.";
  if (s.hunger < 40 || s.thirst < 40) return "A little snack or water would help.";
  if (s.clean < 35) return "Bath time might lift the mood.";
  return "Steady as she goes.";
}
function BackgroundDecor() {
  return (
    <>
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[1200px] h-[600px]"
           style={{ background:"radial-gradient(600px 300px at 50% 0%, rgba(255,255,255,.35), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[.06]" style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.6) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />
    </>
  );
}
function StyleBlock() {
  return (
    <style>{`
      .sprite-float { animation: floaty 4s ease-in-out infinite; }
      @keyframes floaty { 0% { transform: translateY(0) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0) } }
    `}</style>
  );
}
