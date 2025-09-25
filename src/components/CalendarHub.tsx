// src/components/CalendarHub.tsx
import { useEffect, useMemo, useState } from "react";
import { Calendar as CalIcon, Sparkles, PenLine, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Mood = "😀" | "🙂" | "😐" | "🙁" | "😢" | "";
type DayKey = string; // "YYYY-MM-DD"

type StoreShape = {
  moods: Record<DayKey, Mood>;
  gratitude: Record<DayKey, string[]>;
};

const LS_KEY = "vlinks.calendar.v1";

function loadLS(): StoreShape {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { moods: {}, gratitude: {} };
  } catch {
    return { moods: {}, gratitude: {} };
  }
}
function saveLS(s: StoreShape) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const MOODS: Mood[] = ["😀", "🙂", "😐", "🙁", "😢"];

export default function CalendarHub() {
  const [store, setStore] = useState<StoreShape>(() => loadLS());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() }; // 0-11
  });
  const [selectedDay, setSelectedDay] = useState<DayKey>(ymd(new Date()));
  const [newNote, setNewNote] = useState("");
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDayNotes, setLoadingDayNotes] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => saveLS(store), [store]);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // fetch current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // month grid
  const grid = useMemo(() => {
    const start = firstDayOfMonth(cursor.y, cursor.m);
    const startWeekday = (start.getDay() + 6) % 7; // Monday = 0
    const total = daysInMonth(cursor.y, cursor.m);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(cursor.y, cursor.m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const selectedNotes = store.gratitude[selectedDay] || [];

  // fetch current month data from Supabase
  useEffect(() => {
    if (!userId || !online) return;
    let abort = false;
    (async () => {
      setLoadingMonth(true);
      try {
        const monthStart = ymd(new Date(cursor.y, cursor.m, 1));
        const monthEnd = ymd(new Date(cursor.y, cursor.m, daysInMonth(cursor.y, cursor.m)));

        // moods
        const { data: moodsData, error: moodsErr } = await supabase
          .from("mood_logs")
          .select("day,mood")
          .eq("user_id", userId)
          .gte("day", monthStart)
          .lte("day", monthEnd);

        if (moodsErr) throw moodsErr;

        // gratitude notes
        const { data: notesData, error: notesErr } = await supabase
          .from("gratitude_notes")
          .select("day,note,created_at")
          .eq("user_id", userId)
          .gte("day", monthStart)
          .lte("day", monthEnd)
          .order("day", { ascending: false })
          .order("created_at", { ascending: false });

        if (notesErr) throw notesErr;
        if (abort) return;

        // merge into local store
        setStore((s) => {
          const moods = { ...s.moods };
          moodsData?.forEach((row) => {
            moods[row.day] = row.mood as Mood;
          });

          const gratitude: StoreShape["gratitude"] = { ...s.gratitude };
          // keep at most 5 per day
          const grouped = new Map<string, string[]>();
          notesData?.forEach((n) => {
            const arr = grouped.get(n.day) ?? [];
            arr.push(n.note);
            grouped.set(n.day, arr);
          });
          for (const [k, arr] of grouped) {
            gratitude[k] = arr.slice(0, 5);
          }
          return { moods, gratitude };
        });
      } catch {
        // ignore, keep local cache
      } finally {
        if (!abort) setLoadingMonth(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [userId, online, cursor]);

  // when switching day, refresh latest notes for that day
  useEffect(() => {
    if (!userId || !online) return;
    let abort = false;
    (async () => {
      setLoadingDayNotes(true);
      try {
        const { data, error } = await supabase
          .from("gratitude_notes")
          .select("note,created_at")
          .eq("user_id", userId)
          .eq("day", selectedDay)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (abort) return;

        setStore((s) => ({
          ...s,
          gratitude: { ...s.gratitude, [selectedDay]: (data ?? []).map((d) => d.note).slice(0, 5) },
        }));
      } catch {
        // ignore
      } finally {
        if (!abort) setLoadingDayNotes(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [userId, online, selectedDay]);

  // actions
  const setMood = async (k: DayKey, m: Mood) => {
    // optimistic update
    setStore((s) => ({ ...s, moods: { ...s.moods, [k]: m } }));
    if (!userId || !online) return;

    try {
      if (m) {
        const { error } = await supabase
          .from("mood_logs")
          .upsert({ user_id: userId, day: k, mood: m }, { onConflict: "user_id,day" });
        if (error) throw error;
      } else {
        // clear mood
        const { error } = await supabase.from("mood_logs").delete().eq("user_id", userId).eq("day", k);
        if (error) throw error;
      }
    } catch {
      // rollback
      setStore((s) => ({ ...s, moods: { ...s.moods, [k]: loadLS().moods[k] || "" } }));
    }
  };

  const addGratitude = async (k: DayKey, text: string) => {
    if (!text.trim()) return;
    const t = text.trim();

    // optimistic update
    setStore((s) => {
      const list = s.gratitude[k] ? [t, ...s.gratitude[k]] : [t];
      return { ...s, gratitude: { ...s.gratitude, [k]: list.slice(0, 5) } };
    });
    setNewNote("");

    if (!userId || !online) return;
    try {
      const { error } = await supabase.from("gratitude_notes").insert({ user_id: userId, day: k, note: t });
      if (error) throw error;
    } catch {
      // insert failed, rollback to local version
      setStore((s) => {
        const base = loadLS();
        return { ...s, gratitude: { ...s.gratitude, [k]: base.gratitude[k] || [] } };
      });
    }
  };

  const deleteGratitude = async (k: DayKey, note: string) => {
    // optimistic delete first matching local item
    setStore((s) => {
      const list = s.gratitude[k] || [];
      const idx = list.indexOf(note);
      if (idx === -1) return s;
      const next = [...list];
      next.splice(idx, 1);
      return { ...s, gratitude: { ...s.gratitude, [k]: next } };
    });

    if (!userId || !online) return;

    try {
      // since we do not store note id, delete the latest matching row
      const { data, error } = await supabase
        .from("gratitude_notes")
        .select("id, note, created_at")
        .eq("user_id", userId)
        .eq("day", k)
        .eq("note", note)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data[0]) {
        const { error: delErr } = await supabase.from("gratitude_notes").delete().eq("id", data[0].id);
        if (delErr) throw delErr;
      }
    } catch {
      // refresh that day's data on failure
      const { data } = await supabase
        .from("gratitude_notes")
        .select("note,created_at")
        .eq("user_id", userId)
        .eq("day", k)
        .order("created_at", { ascending: false });
      setStore((s) => ({
        ...s,
        gratitude: { ...s.gratitude, [k]: (data ?? []).map((d) => d.note).slice(0, 5) },
      }));
    }
  };

  // Insights (last 7 days)
  const insights = useMemo(() => {
    const now = new Date();
    const last7: Mood[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7.push(store.moods[ymd(d)] || "");
    }
    const scoreMap: Record<Mood, number> = { "😀": 5, "🙂": 4, "😐": 3, "🙁": 2, "😢": 1, "": 0 };
    const scores = last7.map((m) => scoreMap[m]);
    const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
    const blanks = last7.filter((m) => !m).length;

    // streak (has mood or gratitude)
    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const k = ymd(d);
      if (store.moods[k] || (store.gratitude[k] && store.gratitude[k].length > 0)) streak++;
      else break;
    }

    const tips: string[] = [];
    if (avg && avg < 3) tips.push("This week looks a bit low. Try 10 minutes of breathing and stretching at night.");
    if (blanks >= 3) tips.push("You missed a few days. Consider a daily 9 pm reminder.");
    if (streak >= 3) tips.push(`Nice streak: ${streak} days. Write one small gratitude today.`);
    if (!tips.length) tips.push("Good momentum. Do a 25-minute focus block, then add one gratitude.");

    return { avg: Math.round(avg * 10) / 10, blanks, streak, tips };
  }, [store]);

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#061024] via-[#0a1629] to-[#02060c]">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalIcon className="w-5 h-5" />
            <div className="tracking-[0.18em] font-semibold">CALENDAR</div>
          </div>
          <div className="text-xs text-white/70">
            Mood · Gratitude · Insights {online ? "" : "(Offline)"}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Calendar + Mood */}
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
          {/* Month switcher */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                setCursor((c) => {
                  const m = c.m === 0 ? 11 : c.m - 1;
                  const y = c.m === 0 ? c.y - 1 : c.y;
                  return { y, m };
                })
              }
              className="px-2 py-1 rounded-lg border border-white/15 bg-white/5 active:scale-95"
              aria-label="prev month"
              disabled={loadingMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-medium">
              {new Date(cursor.y, cursor.m).toLocaleString(undefined, { month: "long", year: "numeric" })}
              {loadingMonth ? " · Syncing…" : ""}
            </div>
            <button
              onClick={() =>
                setCursor((c) => {
                  const m = c.m === 11 ? 0 : c.m + 1;
                  const y = c.m === 11 ? c.y + 1 : c.y;
                  return { y, m };
                })
              }
              className="px-2 py-1 rounded-lg border border-white/15 bg-white/5 active:scale-95"
              aria-label="next month"
              disabled={loadingMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week header */}
          <div className="grid grid-cols-7 text-center text-xs text-white/60 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} className="h-16 rounded-xl border border-transparent" />;
              const k = ymd(d);
              const m = store.moods[k] || "";
              const isSelected = k === selectedDay;

              return (
                <button
                  key={k}
                  onClick={() => setSelectedDay(k)}
                  className={`h-16 rounded-xl relative overflow-hidden text-left p-2 border ${
                    isSelected ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="text-[11px] text-white/70">{d.getDate()}</div>
                  {!!m && <div className="absolute right-1.5 bottom-1 text-lg">{m}</div>}
                  {k === ymd(new Date()) && (
                    <span className="absolute left-1 top-1 inline-block w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mood picker */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-white/70">Mood:</span>
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(selectedDay, m)}
                className={`px-3 py-1.5 rounded-full border text-lg ${
                  store.moods[selectedDay] === m ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/15"
                }`}
                title={`Set mood ${m}`}
                disabled={!userId || !online}
              >
                {m}
              </button>
            ))}
            <button
              onClick={() => setMood(selectedDay, "")}
              className="ml-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs"
              disabled={!userId || !online}
            >
              Clear
            </button>
          </div>
        </section>

        {/* Right: Gratitude + Suggestions */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 flex flex-col gap-4">
          {/* Gratitude */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-4 h-4" />
              <span className="font-medium">Gratitude Journal</span>
            </div>
            <div className="text-xs text-white/60 mb-2">
              {selectedDay} {loadingDayNotes ? "· Loading…" : "· Write one to three small things"}
            </div>
            <div className="flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="One thing you are grateful for..."
                className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                disabled={!online || !userId}
              />
              <button
                onClick={() => addGratitude(selectedDay, newNote)}
                className="px-4 rounded-xl border border-white/20 bg-white text-black text-sm hover:bg-white/90 active:scale-95"
                disabled={!online || !userId}
              >
                Add
              </button>
            </div>
            {!!selectedNotes.length && (
              <ul className="mt-3 space-y-2 text-sm">
                {selectedNotes.map((t, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => deleteGratitude(selectedDay, t)}
                      className="p-1 rounded-md hover:bg-white/10"
                      title="Delete"
                      disabled={!online || !userId}
                    >
                      <Trash2 className="w-4 h-4 opacity-80" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!selectedNotes.length && <div className="mt-3 text-xs text-white/50">No records today</div>}
          </div>

          {/* Suggestions */}
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Vlinks Suggestions</span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
              <div className="text-white/80 mb-2">
                Average mood in the past 7 days <b>{insights.avg || "-"}</b> · missed days <b>{insights.blanks}</b> ·
                streak <b>{insights.streak}</b> days
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {insights.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 pb-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2 text-center text-xs text-white/70">
          Calm • Focus • Connect
        </div>
      </footer>
    </div>
  );
}
