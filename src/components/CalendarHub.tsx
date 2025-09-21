// src/components/CalendarHub.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Calendar as CalIcon, Sparkles, PenLine, ChevronLeft, ChevronRight } from "lucide-react";

type Mood = "😀"|"🙂"|"😐"|"🙁"|"😢" | "";
type DayKey = string; // "YYYY-MM-DD"

type StoreShape = {
  moods: Record<DayKey, Mood>;
  gratitude: Record<DayKey, string[]>;
};

const LS_KEY = "vlinks.calendar.v1";

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { moods: {}, gratitude: {} };
  } catch {
    return { moods: {}, gratitude: {} };
  }
}
function save(s: StoreShape) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function ymd(d: Date) {
  return d.toISOString().slice(0,10);
}
function firstDayOfMonth(year:number, month:number){ return new Date(year, month, 1); }
function daysInMonth(year:number, month:number){ return new Date(year, month+1, 0).getDate(); }

const MOODS: Mood[] = ["😀","🙂","😐","🙁","😢"];

export default function CalendarHub() {
  const [store, setStore] = useState<StoreShape>(() => load());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() }; // 0-11
  });
  const [selectedDay, setSelectedDay] = useState<DayKey>(ymd(new Date()));
  const [newNote, setNewNote] = useState("");

  useEffect(()=>save(store), [store]);

  // month grid
  const grid = useMemo(() => {
    const start = firstDayOfMonth(cursor.y, cursor.m);
    const startWeekday = (start.getDay() + 6) % 7; // Monday=0
    const total = daysInMonth(cursor.y, cursor.m);
    const cells: (Date|null)[] = [];
    for (let i=0;i<startWeekday;i++) cells.push(null);
    for (let d=1; d<=total; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const todayKey = ymd(new Date());

  // actions
  const setMood = (k:DayKey, m:Mood) =>
    setStore(s => ({ ...s, moods: { ...s.moods, [k]: m }}));

  const addGratitude = (k:DayKey, text:string) => {
    if (!text.trim()) return;
    setStore(s => {
      const list = s.gratitude[k] ? [...s.gratitude[k]] : [];
      list.unshift(text.trim());
      return { ...s, gratitude: { ...s.gratitude, [k]: list.slice(0,5) } }; // up to 5 per day
    });
    setNewNote("");
  };

  // Insights (last 7 days)
  const insights = useMemo(() => {
    const now = new Date();
    const last7: Mood[] = [];
    for (let i=0;i<7;i++){
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7.push(store.moods[ymd(d)] || "");
    }
    const scoreMap: Record<Mood, number> = { "😀":5, "🙂":4, "😐":3, "🙁":2, "😢":1, "":0 };
    const scores = last7.map(m => scoreMap[m]);
    const avg = scores.reduce((a,b)=>a+b,0) / Math.max(1, scores.length);
    const blanks = last7.filter(m=>!m).length;

    // streak (has mood or gratitude)
    let streak = 0;
    for (let i=0;i<7;i++){
      const d = new Date(now);
      d.setDate(now.getDate()-i);
      const k = ymd(d);
      if (store.moods[k] || (store.gratitude[k] && store.gratitude[k].length>0)) streak++;
      else break;
    }

    const tips:string[] = [];
    if (avg && avg < 3) tips.push("Feeling a bit low this week — try 10 minutes of breathing and stretching in the evening, it may help.");
    if (blanks >= 3) tips.push("You missed a few days of check-ins — consider a gentle daily reminder at 9 PM.");
    if (streak >= 3) tips.push(`Nice streak: ${streak} days in a row! Keep it up — add one tiny gratitude today 🌱`);
    if (!tips.length) tips.push("You’re doing well! Schedule a 25-minute focus sprint and jot one gratitude afterwards 😌");

    return { avg: Math.round(avg*10)/10, blanks, streak, tips };
  }, [store]);

  const selectedNotes = store.gratitude[selectedDay] || [];

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#061024] via-[#0a1629] to-[#02060c]">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalIcon className="w-5 h-5" />
            <div className="tracking-[0.18em] font-semibold">CALENDAR</div>
          </div>
          <div className="text-xs text-white/70">Mood · Gratitude · Insights</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Calendar + Mood */}
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          {/* Month switcher */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCursor(c => {
                const m = c.m === 0 ? 11 : c.m-1; const y = c.m===0 ? c.y-1 : c.y;
                return { y, m };
              })}
              className="px-2 py-1 rounded-lg border border-white/15 bg-white/5 active:scale-95"
              aria-label="prev month"
            >
              <ChevronLeft className="w-4 h-4"/>
            </button>
            <div className="font-medium">
              {new Date(cursor.y, cursor.m).toLocaleString(undefined, { month: "long", year: "numeric" })}
            </div>
            <button
              onClick={() => setCursor(c => {
                const m = c.m === 11 ? 0 : c.m+1; const y = c.m===11 ? c.y+1 : c.y;
                return { y, m };
              })}
              className="px-2 py-1 rounded-lg border border-white/15 bg-white/5 active:scale-95"
              aria-label="next month"
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>

          {/* Week header */}
          <div className="grid grid-cols-7 text-center text-xs text-white/60 mb-2">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>(
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} className="h-16 rounded-xl border border-transparent"/>;
              const k = ymd(d);
              const m = store.moods[k] || "";
              const isToday = k === todayKey;
              const isSelected = k === selectedDay;

              return (
                <button
                  key={k}
                  onClick={()=>setSelectedDay(k)}
                  className={`h-16 rounded-xl relative overflow-hidden text-left p-2 border
                    ${isSelected ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}
                  `}
                >
                  <div className="text-[11px] text-white/70">{d.getDate()}</div>
                  {!!m && <div className="absolute right-1.5 bottom-1 text-lg">{m}</div>}
                  {isToday && <span className="absolute left-1 top-1 inline-block w-1.5 h-1.5 rounded-full bg-white/80" />}
                </button>
              );
            })}
          </div>

          {/* Mood picker */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-white/70">Mood:</span>
            {MOODS.map(m => (
              <button
                key={m}
                onClick={()=>setMood(selectedDay, m)}
                className={`px-3 py-1.5 rounded-full border text-lg
                  ${store.moods[selectedDay]===m ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/15"}`}
                title={`Set mood ${m}`}
              >
                {m}
              </button>
            ))}
            <button
              onClick={()=>setMood(selectedDay, "")}
              className="ml-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs"
            >
              Clear
            </button>
          </div>
        </section>

        {/* Right: Gratitude + AI */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 flex flex-col gap-4">
          {/* Gratitude */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4"/><span className="font-medium">Gratitude Journal</span>
            </div>
            <div className="text-xs text-white/60 mb-2">{selectedDay} · Write 1–3 tiny things</div>
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={e=>setNewNote(e.target.value)}
                placeholder="One tiny thing you're grateful for…"
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
              />
              <button
                onClick={()=>addGratitude(selectedDay, newNote)}
                className="px-4 rounded-xl border border-white/20 bg-white text-black text-sm hover:bg-white/90 active:scale-95"
              >
                Add
              </button>
            </div>
            {!!selectedNotes.length && (
              <ul className="mt-3 space-y-2 text-sm">
                {selectedNotes.map((t, idx)=>(
                  <li key={idx} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{t}</li>
                ))}
              </ul>
            )}
            {!selectedNotes.length && (
              <div className="mt-3 text-xs text-white/50">No notes yet today.</div>
            )}
          </div>

          {/* AI Suggestions */}
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4"/><span className="font-medium">Vlinks Suggestions</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
              <div className="text-white/80 mb-2">
                Last 7 days · Avg mood <b>{insights.avg || "-"}</b> · Missed <b>{insights.blanks}</b> days · Streak <b>{insights.streak}</b> days
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {insights.tips.map((t,i)=><li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 pb-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-center text-xs text-white/70">
          Calm • Focus • Connect — keep it gentle 🌊
        </div>
      </footer>
    </div>
  );
}
