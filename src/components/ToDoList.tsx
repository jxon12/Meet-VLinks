import React, { useEffect, useRef, useState } from "react";
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
  X,
  BarChart3,
  Home,
  PieChart,
  Sparkles,
  MessageSquare,
  Copy,
  ImagePlus,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";

/* ---------- Supabase client ---------- */
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : (null as any);

/** ============ Types ============ */
type Priority = "high" | "medium" | "low";
type EnergyLevel = "high" | "medium" | "low";
interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  estimatedTime?: number; // minutes
  energyRequired: EnergyLevel;
  tags: string[];
  createdAt: number;
  completedAt?: number;
}
interface Course {
  id: string;
  title: string;
  room?: string;
  day: number;   // 1~7 (Mon~Sun)
  start: string; // "08:00"
  end: string;   // "10:00"
  color: string;
}

/** utils */
const rid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeSlots = Array.from({ length: 12 }).map(
  (_, i) => `${(8 + i).toString().padStart(2, "0")}:00`
);

// ENV
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

/** Speech helpers */
const hasWebSpeech =
  typeof window !== "undefined" &&
  ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

/** ============ Component ============ */
export default function ToDoList() {
  /** tabs: tasks / growth / calendar / assistant */
  const [tab, setTab] = useState<"tasks" | "growth" | "calendar" | "assistant">("tasks");

  /** ------- Tasks (local) -------- */
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("vlinks:tasks");
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => localStorage.setItem("vlinks:tasks", JSON.stringify(tasks)), [tasks]);

  const [input, setInput] = useState("");
  const [quickPriority, setQuickPriority] = useState<Priority>("medium");
  const [quickEnergy, setQuickEnergy] = useState<EnergyLevel>("medium");

  const parseInput = (text: string): Partial<Task> => {
    const result: Partial<Task> = { tags: [] };
    // tags
    const tagMatches = text.match(/#(\w+)/g);
    if (tagMatches) {
      result.tags = tagMatches.map((t) => t.slice(1));
      text = text.replace(/#(\w+)/g, "").trim();
    }
    // duration
    const timeMatch = text.match(/(\d+)\s*(min|minutes|hour|hours|h)/i);
    if (timeMatch) {
      const v = parseInt(timeMatch[1], 10);
      result.estimatedTime = /hour|h/i.test(timeMatch[2]) ? v * 60 : v;
      text = text.replace(timeMatch[0], "").trim();
    }
    result.title = text;
    return result;
  };

  const addTask = () => {
    const t = input.trim();
    if (!t) return;
    const p = parseInput(t);
    const newTask: Task = {
      id: rid(),
      title: p.title || t,
      done: false,
      priority: quickPriority,
      energyRequired: quickEnergy,
      tags: p.tags || [],
      estimatedTime: p.estimatedTime,
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setInput("");
  };

  const toggleTask = (id: string) => {
    setTasks((ts) =>
      ts.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined }
          : t
      )
    );
  };

  /** ------- Pomodoro -------- */
  const [pomoOpen, setPomoOpen] = useState(false);
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [leftSec, setLeftSec] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setLeftSec((s) => {
        if (s > 1) return s - 1;
        if (phase === "work") {
          if (rounds > 1) {
            setPhase("break");
            return breakMin * 60;
          } else {
            setRunning(false);
            return 0;
          }
        } else {
          setPhase("work");
          setRounds((r) => r - 1);
          return workMin * 60;
        }
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, breakMin, workMin, rounds]);

  const resetPomo = () => {
    setRunning(false);
    setPhase("work");
    setLeftSec(workMin * 60);
  };
  useEffect(() => {
    if (phase === "work") setLeftSec(workMin * 60);
  }, [workMin]);
  useEffect(() => {
    if (phase === "break") setLeftSec(breakMin * 60);
  }, [breakMin]);

  const mmss = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  /** ------- Growth (analytics from local tasks) ------- */
  const todayStr = new Date().toDateString();
  const completedToday = tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt).toDateString() === todayStr
  );
  const learnedMinutes = completedToday.reduce(
    (sum, t) => sum + (t.estimatedTime || 0),
    0
  );

  const hourly = Array.from({ length: 24 }, () => 0);
  completedToday.forEach((t) => {
    const h = new Date(t.completedAt!).getHours();
    hourly[h] += t.estimatedTime || 30;
  });
  const maxMin = Math.max(60, ...hourly);

  const tagCount: Record<string, number> = {};
  completedToday.forEach((t) =>
    (t.tags || []).forEach((tag) => (tagCount[tag] = (tagCount[tag] || 0) + 1))
  );
  const tagEntries = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  /** ------- Calendar (Supabase) ------- */
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id,title,room,wday,start_time,end_time,color")
          .order("wday", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) throw error;

        if (data && data.length) {
          setCourses(
            data.map((r: any) => ({
              id: r.id,
              title: r.title,
              room: r.room ?? "",
              day: r.wday,
              start: (r.start_time as string).slice(0, 5),
              end: (r.end_time as string).slice(0, 5),
              color: r.color ?? "#a2b6ff",
            }))
          );
        } else {
          const seed: Course[] = [
            {
              id: rid(),
              title: "C MT1114 Lecture",
              room: "Lecture Theatre 3",
              day: 4,
              start: "08:00",
              end: "10:00",
              color: "#61e4ff",
            },
            {
              id: rid(),
              title: "C CT1114 Lab",
              room: "Com Lab",
              day: 1,
              start: "16:00",
              end: "18:00",
              color: "#a2b6ff",
            },
          ];
          setCourses(seed);
          try {
            await supabase.from("courses").upsert(
              seed.map((c) => ({
                title: c.title,
                room: c.room || null,
                wday: c.day,
                start_time: c.start + ":00",
                end_time: c.end + ":00",
                color: c.color,
              }))
            );
          } catch (e) {
            console.warn("seed to DB failed:", e);
          }
        }
      } catch (e) {
        console.warn("load courses failed:", e);
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, []);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<Course>({
    id: "",
    title: "",
    room: "",
    day: 1,
    start: "08:00",
    end: "10:00",
    color: "#a2b6ff",
  });

  const openNewCourse = (day: number, start: string) => {
    setEditing(null);
    setForm({
      id: "",
      title: "New Class",
      room: "",
      day,
      start,
      end: addHour(start, 1),
      color: "#a2b6ff",
    });
    setEditOpen(true);
  };
  const openEditCourse = (c: Course) => {
    setEditing(c);
    setForm(c);
    setEditOpen(true);
  };

  const saveCourse = async () => {
    if (!form.title.trim()) return;

    const payload: any = {
      title: form.title,
      room: form.room || null,
      wday: form.day,
      start_time: form.start + ":00",
      end_time: form.end + ":00",
      color: form.color || "#a2b6ff",
    };
    if (editing?.id) payload.id = editing.id;

    const rollback: Course[] = [...courses];

    if (editing) {
      setCourses((cs) =>
        cs.map((c) => (c.id === editing.id ? { ...form, id: editing.id } : c))
      );
    } else {
      const tempId = rid();
      setCourses((cs) => [...cs, { ...form, id: tempId }]);
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .upsert(payload, { onConflict: "id" })
        .select("id,title,room,wday,start_time,end_time,color")
        .single();

      if (error) throw error;

      const saved: Course = {
        id: data.id,
        title: data.title,
        room: data.room ?? "",
        day: data.wday,
        start: (data.start_time as string).slice(0, 5),
        end: (data.end_time as string).slice(0, 5),
        color: data.color ?? "#a2b6ff",
      };

      setCourses((cs) => {
        const idx = cs.findIndex((c) => c.id === (editing ? editing.id : saved.id));
        if (idx >= 0) {
          const next = [...cs];
          next[idx] = saved;
          return next;
        }
        return cs.map((c) =>
          c.title === form.title && c.day === form.day && c.start === form.start ? saved : c
        );
      });
    } catch (e) {
      console.error("saveCourse failed:", e);
      setCourses(rollback);
      alert("Save failed.");
    } finally {
      setEditOpen(false);
      setEditing(null);
    }
  };

  const deleteCourse = async (id: string) => {
    const backup = [...courses];
    setCourses((cs) => cs.filter((c) => c.id !== id));
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("deleteCourse failed:", e);
      setCourses(backup);
      alert("Delete failed.");
    }
  };

  function addHour(t: string, hours: number) {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h + hours, m, 0, 0);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  /** ------- Assistant (Gemini) ------- */
  type ChatMsg = {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
  };
  const [assistantMsgs, setAssistantMsgs] = useState<ChatMsg[]>(() => {
    const s = localStorage.getItem("vlinks:assistantMsgs");
    return s ? JSON.parse(s) : [];
  });
  useEffect(
    () => localStorage.setItem("vlinks:assistantMsgs", JSON.stringify(assistantMsgs)),
    [assistantMsgs]
  );

  const [assistantInput, setAssistantInput] = useState("");
  const [aLoading, setALoading] = useState(false);
  const [attachData, setAttachData] = useState<{
    mime: string;
    b64: string;
    url: string;
  } | null>(null);

  const pushMsg = (role: "user" | "assistant", content: string, imageUrl?: string) =>
    setAssistantMsgs((list) => [...list, { id: rid(), role, content, imageUrl }]);

  function dataUrlToParts(dataUrl: string) {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.substring(meta.indexOf(":") + 1, meta.indexOf(";"));
    return { mime, b64 };
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function callGemini(text: string, image?: { mime: string; b64: string }) {
    if (!GEMINI_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

    const parts: any[] = [];
    if (text) parts.push({ text });
    if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.b64 } });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          role: "user",
          parts: [
            {
              text: "You are a helpful academic assistant. Please always answer strictly in clear, concise English. Prefer short bullet points and concrete steps.",
            },
          ],
        },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.7 },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const textOut =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ||
      "(no response)");
    return textOut;
  }

  async function sendAssistant() {
    const q = assistantInput.trim();
    if (!q && !attachData) return;
    const imageUrl = attachData?.url;
    pushMsg("user", q || "(image)", imageUrl);
    setAssistantInput("");
    setALoading(true);
    try {
      const answer = await callGemini(
        q || "Please describe this image.",
        attachData ? { mime: attachData.mime, b64: attachData.b64 } : undefined
      );
      pushMsg("assistant", answer);
      if (voiceTTSOn) speak(answer);
    } catch (e: any) {
      pushMsg("assistant", `Sorry, something went wrong.\n\n${e?.message || e}`);
    } finally {
      setALoading(false);
      setAttachData(null);
    }
  }

  function addAiReplyToTasks(text: string) {
    const newTask: Task = {
      id: rid(),
      title: text.slice(0, 80).replace(/\s+/g, " "),
      done: false,
      priority: "medium",
      energyRequired: "medium",
      tags: ["ai"],
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
  }

  /** ------- Voice (Siri-like panel) ------- */
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceTTSOn, setVoiceTTSOn] = useState(true);
  const [hotwordOn, setHotwordOn] = useState(false);

  const recogRef = useRef<any | null>(null);

  function ensureRecognizer(continuous = false) {
    if (!hasWebSpeech) return null;
    const SR: any =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = continuous;
    return r;
  }

  function startListening({ continuous = false, forHotword = false } = {}) {
    if (!hasWebSpeech || listening) return;
    const r = ensureRecognizer(continuous);
    if (!r) return;
    recogRef.current = r;
    setListening(true);
    let finalText = "";
    r.onresult = (e: any) => {
      let combined = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript;
        } else {
          combined += res[0].transcript;
        }
      }
      setInterim(combined);

      if (forHotword) {
        const textAllLower = (finalText + combined).toLowerCase();
        if (textAllLower.includes("hey vlinks")) {
          setVoiceOpen(true);
          setHotwordOn(false);
          stopListening();

          const originalAll = finalText + combined;
          const idx = originalAll.toLowerCase().indexOf("hey vlinks");
          const afterOriginal =
            idx >= 0 ? originalAll.slice(idx + "hey vlinks".length).trim() : "";

          if (afterOriginal) {
            setAssistantInput(afterOriginal);
            setTimeout(() => sendAssistant(), 0);
          } else {
            setTimeout(() => startListening({ continuous: false, forHotword: false }), 120);
          }
        }
      }
    };
    r.onerror = () => {
      setListening(false);
    };
    r.onend = () => {
      const wasHotword = forHotword;
      setListening(false);

      if (!wasHotword) {
        const spoken = (finalText || interim).trim();
        if (spoken) {
          setAssistantInput(spoken);
          setTimeout(() => sendAssistant(), 0);
        }
        setInterim("");
      } else if (hotwordOn) {
        startListening({ continuous: true, forHotword: true });
      }
    };
    try {
      r.start();
    } catch {}
  }

  function stopListening() {
    try {
      recogRef.current?.stop();
    } catch {}
    setListening(false);
    setInterim("");
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    const all = window.speechSynthesis.getVoices?.() || [];

    const mark =
      all.find((v) => v.name?.toLowerCase().includes("microsoft mark")) ||
      all.find((v) => v.voiceURI?.toLowerCase().includes("microsoft mark"));

    const en = all.find((v) => v.lang?.toLowerCase().startsWith("en-us"));

    const chosen = mark || en || all[0];

    if (chosen) {
      u.voice = chosen;
      u.lang = chosen.lang || "en-US";
    } else {
      u.lang = "en-US";
    }
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;

    if (!chosen && window.speechSynthesis.onvoiceschanged) {
      window.speechSynthesis.onvoiceschanged = () => {
        const retry = window.speechSynthesis.getVoices?.() || [];
        const mark2 =
          retry.find((v) => v.name?.toLowerCase().includes("microsoft mark")) ||
          retry.find((v) => v.voiceURI?.toLowerCase().includes("microsoft mark"));
        const en2 = retry.find((v) => v.lang?.toLowerCase().startsWith("en-us"));
        const picked = mark2 || en2 || retry[0];
        if (picked) {
          u.voice = picked;
          u.lang = picked.lang || "en-US";
        }
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      };
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  /** ------- UI ------- */
  return (
    <div
      className="theme-pearl min-h-screen text-white pt-16 pb-28 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(147,197,253,0.14), transparent 70%), linear-gradient(180deg, #070a12 0%, #0b172b 55%, #070a12 100%)",
      }}
    >
      {/* Pomodoro modal */}
      {pomoOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e1626] border border-white/15 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-blue-50">Pomodoro</div>
              <button
                onClick={() => {
                  setPomoOpen(false);
                  setRunning(false);
                  if (intervalRef.current) clearInterval(intervalRef.current);
                }}
                className="text-blue-200 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-blue-200/85 text-sm mb-3 capitalize">
              Phase: <span className="text-cyan-200 font-medium">{phase}</span>
            </div>

            <div className="text-5xl font-semibold text-white text-center tracking-widest mb-4">
              {mmss(leftSec)}
            </div>

            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => setRunning((v) => !v)}
                className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-black font-medium hover:brightness-110 active:scale-[.98] transition"
              >
                {running ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => {
                  resetPomo();
                }}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-blue-100 hover:bg-white/15 transition active:scale-[.98]"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-blue-200/80">
                Work
                <input
                  type="number"
                  min={1}
                  value={workMin}
                  onChange={(e) => setWorkMin(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full h-9 px-2 rounded bg-white/10 border border-white/15 text-white"
                />
              </label>
              <label className="text-xs text-blue-200/80">
                Break
                <input
                  type="number"
                  min={1}
                  value={breakMin}
                  onChange={(e) => setBreakMin(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full h-9 px-2 rounded bg-white/10 border border-white/15 text-white"
                />
              </label>
              <label className="text-xs text-blue-200/80">
                Rounds
                <input
                  type="number"
                  min={1}
                  value={rounds}
                  onChange={(e) => setRounds(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full h-9 px-2 rounded bg-white/10 border border-white/15 text-white"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* header */}
      <header className="sticky top-0 z-20 px-5 py-3 backdrop-blur bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="font-semibold tracking-[0.14em] flex items-center gap-2 text-[color:var(--text)]">
          <CalendarDays className="w-5 h-5 text-[color:var(--brand)]" />
          TASKS
        </div>
        <button
          onClick={() => setPomoOpen(true)}
          className="text-cyan-100 px-3 h-9 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition flex items-center gap-2"
          title="Pomodoro"
        >
          Pomodoro
        </button>
      </header>

      {/* main */}
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {tab === "tasks" && (
          <>
            {/* input + quick chips */}
            <div className="px-5 mt-6">
              <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] backdrop-blur-xl p-3 shadow-[var(--glow)]">
                <div className="flex gap-2 items-center">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="Add a task… e.g. Finish lab report #FCI 45min"
                    className="flex-1 h-11 px-4 rounded-lg bg-white/10 backdrop-blur-md text-white placeholder-white/60 caret-white border border-white/15 shadow-[inset_0_1px_2px_rgba(255,255,255,0.12)] focus:outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/30 text-sm"
                  />
                  <button
                    onClick={addTask}
                    className="h-11 w-11 flex items-center justify-center rounded-lg bg-[color:var(--brand)] text-black border border-white/20 shadow-md hover:brightness-110 transition active:scale-[.98]"
                    aria-label="Add task"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {(["high", "medium", "low"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setQuickPriority(p)}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        quickPriority === p
                          ? "bg-[color:var(--brand)] text-black border-transparent"
                          : "bg-white/5 border-white/10 text-blue-100"
                      }`}
                    >
                      Priority: {p}
                    </button>
                  ))}
                  {(["high", "medium", "low"] as EnergyLevel[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => setQuickEnergy(e)}
                      className={`px-3 py-1 rounded-full text-xs border transition ${
                        quickEnergy === e
                          ? "bg-[color:var(--brand)] text-black border-transparent"
                          : "bg-white/5 border-white/10 text-blue-100"
                      }`}
                    >
                      Energy: {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* task list */}
            <section className="px-5 mt-5 space-y-2">
              {tasks
                .filter((t) => !t.done)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 group hover:bg-white/8 transition-colors shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="text-blue-200 hover:text-[color:var(--brand)] transition"
                        aria-label="Complete"
                        title="Complete"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm text-blue-50/95 truncate">{task.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {task.estimatedTime && (
                            <span className="text-xs text-cyan-200/90 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.estimatedTime}min
                            </span>
                          )}
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] bg-[color:var(--brand)]/20 px-2 py-0.5 rounded-full text-cyan-100 border border-[color:var(--brand)]/30"
                            >
                              #{tag}
                            </span>
                          ))}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-blue-100/90">
                            P:{task.priority} • E:{task.energyRequired}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setTasks((ts) => ts.filter((t) => t.id !== task.id))}
                      className="opacity-0 group-hover:opacity-100 transition text-white hover:text-white"
                      aria-label="Delete task"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

              {/* completed today */}
              {completedToday.length > 0 && (
                <div className="mt-6">
                  <div className="text-xs text-blue-200/80 mb-2">Completed today</div>
                  <div className="space-y-1">
                    {completedToday.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-blue-200/80 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-[color:var(--brand)]" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tasks.filter((t) => !t.done).length === 0 && (
                <div className="text-center py-10">
                  <div className="text-3xl">🐚</div>
                  <div className="text-blue-100/90">All clear, add something above.</div>
                  <div className="text-blue-300/60 text-xs mt-1">
                    Try “Read chapter 3 #math 30min”
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {tab === "growth" && (
          <section className="px-5 mt-6">
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] backdrop-blur-xl p-4 shadow-[var(--glow)]">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-blue-50 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[color:var(--brand)]" /> Personal Growth
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl bg-white/6 border border-white/10 p-3">
                  <div className="text-xs text-blue-200/80">Tasks Completed</div>
                  <div className="text-2xl font-semibold text-white mt-1">
                    {completedToday.length}
                  </div>
                </div>
                <div className="rounded-xl bg-white/6 border border-white/10 p-3">
                  <div className="text-xs text-blue-200/80">Estimated Study (min)</div>
                  <div className="text-2xl font-semibold text-white mt-1">{learnedMinutes}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-xs text-blue-200/80 mb-2">Today, time distribution</div>
                <div className="flex items-end gap-1 h-28">
                  {hourly.map((v, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-white/6 rounded-t border border-white/8"
                      style={{
                        height: `${(v / maxMin) * 100}%`,
                        boxShadow: "0 0 8px rgba(147,197,253,.15) inset",
                      }}
                      title={`${i}:00 • ${v}min`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-blue-300/70 mt-1">
                  <span>0</span>
                  <span>6</span>
                  <span>12</span>
                  <span>18</span>
                  <span>24h</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-200/80 mb-2">Top Tags</div>
                {tagEntries.length === 0 && (
                  <div className="text-blue-200/80 text-sm">
                    Complete tasks with #tags to see stats.
                  </div>
                )}
                <div className="space-y-2">
                  {tagEntries.map(([tag, count]) => (
                    <div key={tag} className="flex items-center gap-2">
                      <div className="text-xs w-20 text-blue-100">#{tag}</div>
                      <div className="flex-1 h-2 rounded bg-white/6 border border-white/10 overflow-hidden">
                        <div
                          className="h-full bg-[color:var(--brand)]/80"
                          style={{
                            width: `${(count / tagEntries[0][1]) * 100}%`,
                            boxShadow: "0 0 12px rgba(34,211,238,.35)",
                          }}
                        />
                      </div>
                      <div className="text-xs text-blue-200">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "calendar" && (
          <section className="px-5 mt-6">
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] backdrop-blur-xl p-4 overflow-x-auto shadow-[var(--glow)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-blue-50 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[color:var(--brand)]" /> Weekly Schedule
                </div>
                <div className="text-xs text-blue-200/80">
                  Tap an empty cell to add • Tap a class to edit
                </div>
              </div>

              {coursesLoading && (
                <div className="text-xs text-blue-300/70 mb-2">Loading from cloud…</div>
              )}

              <div className="min-w-[820px]">
                <div className="grid" style={{ gridTemplateColumns: `100px repeat(7, 1fr)` }}>
                  <div />
                  {days.map((d) => (
                    <div key={d} className="px-2 py-1 text-center text-blue-100/90">
                      {d}
                    </div>
                  ))}

                  {timeSlots.map((ts) => (
                    <React.Fragment key={ts}>
                      <div className="h-16 border border-white/10 text-xs text-blue-300/80 px-2 flex items-start pt-1">
                        {ts}
                      </div>
                      {days.map((_, dayIdx) => (
                        <div
                          key={dayIdx}
                          className="h-16 border border-white/10 relative hover:bg-white/6 transition"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("[data-course]")) return;
                            openNewCourse(dayIdx + 1, ts);
                          }}
                        >
                          {courses
                            .filter((c) => c.day === dayIdx + 1 && withinSlot(ts, c.start, c.end))
                            .map((c) => (
                              <div
                                key={c.id}
                                data-course
                                onClick={() => openEditCourse(c)}
                                className="absolute left-1 right-1 rounded-lg text-[11px] px-2 py-1 cursor-pointer"
                                style={{
                                  top: offsetTop(ts, c.start),
                                  height: heightFrom(c.start, c.end),
                                  backgroundColor: c.color + "33",
                                  border: `1px solid ${c.color}`,
                                  boxShadow: `0 10px 24px ${c.color}55, inset 0 1px 0 rgba(255,255,255,.15)`,
                                  backdropFilter: "blur(6px)",
                                }}
                              >
                                <div className="font-medium text-white/95 truncate">{c.title}</div>
                                {c.room && (
                                  <div className="text-white/85">
                                    {c.start}–{c.end} · {c.room}
                                  </div>
                                )}
                                <div className="mt-1 flex gap-2 text-[10px]">
                                  <button
                                    className="px-2 py-0.5 rounded bg-white/10 border border-white/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditing(c);
                                      setForm(c);
                                      setEditOpen(true);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="px-2 py-0.5 rounded bg-white/10 border border-white/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteCourse(c.id);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {editOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
                  <div className="w-full max-w-md rounded-2xl bg-[#0e1626] border border-white/15 p-4">
                    <div className="text-lg font-semibold mb-3">
                      {editing ? "Edit Course" : "New Course"}
                    </div>
                    <div className="space-y-3">
                      <input
                        className="w-full h-10 px-3 rounded bg-white/10 border border-white/15"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Title"
                      />
                      <input
                        className="w-full h-10 px-3 rounded bg-white/10 border border-white/15"
                        value={form.room}
                        onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                        placeholder="Room"
                      />
                      <div className="flex gap-2">
                        <select
                          className="flex-1 h-10 px-3 rounded bg-white/10 border border-white/15"
                          value={form.day}
                          onChange={(e) => setForm((f) => ({ ...f, day: Number(e.target.value) }))}
                        >
                          {days.map((d, i) => (
                            <option key={d} value={i + 1}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <input
                          className="h-10 px-3 rounded bg-white/10 border border-white/15"
                          value={form.start}
                          onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                          placeholder="08:00"
                        />
                        <input
                          className="h-10 px-3 rounded bg-white/10 border border-white/15"
                          value={form.end}
                          onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                          placeholder="10:00"
                        />
                      </div>
                      <input
                        className="w-full h-10 px-3 rounded bg-white/10 border border-white/15"
                        value={form.color}
                        onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                        placeholder="#a2b6ff"
                      />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        className="px-3 py-2 rounded bg-white/10 border border-white/15"
                        onClick={() => setEditOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-3 py-2 rounded bg-[color:var(--brand)] text-black"
                        onClick={saveCourse}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "assistant" && (
          <section className="px-5 mt-6">
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] backdrop-blur-xl p-4 shadow-[var(--glow)] min-h-[60vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-blue-50 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[color:var(--brand)]" /> Assistant
                </div>
                <div className="text-xs text-blue-200/80">
                  {GEMINI_KEY ? "Gemini ready" : "Missing VITE_GEMINI_API_KEY"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  "Help me plan what to study today (bulleted)",
                  "Create 3 review questions with answers about calculus limits",
                  "Explain entropy with a simple example",
                ].map((tip) => (
                  <button
                    key={tip}
                    onClick={() => setAssistantInput(tip)}
                    className="text-xs px-3 py-1 rounded-full bg-white/6 border border-white/10 text-blue-100 hover:bg-white/10 active:scale-[.98] transition"
                  >
                    {tip}
                  </button>
                ))}
              </div>

              <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 overflow-y-auto space-y-3">
                {assistantMsgs.length === 0 && (
                  <div className="text-blue-200/80 text-sm">
                    👋 Ask any study question, or upload an image/screenshot for visual Q&A.
                  </div>
                )}
                {assistantMsgs.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] px-3 py-2 rounded-2xl border ${
                      m.role === "user"
                        ? "ml-auto bg-[color:var(--brand)]/18 border-[color:var(--brand)]/30 text-cyan-50"
                        : "mr-auto bg-white/6 border-white/12 text-blue-50"
                    }`}
                  >
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="upload" className="rounded-lg mb-2 max-w-full" />
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>

                    {m.role === "assistant" && (
                      <div className="flex gap-2 mt-2 text-[11px]">
                        <button
                          onClick={() => addAiReplyToTasks(m.content)}
                          className="px-2 py-1 rounded-lg bg-white/8 border border-white/15 hover:bg-white/12 active:scale-[.98] transition"
                        >
                          Add to Tasks
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="px-2 py-1 rounded-lg bg-white/8 border border-white/15 hover:bg-white/12 flex items-center gap-1 active:scale-[.98] transition"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {aLoading && (
                  <div className="mr-auto flex items-center gap-2 text-blue-200/80 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" /> Thinking…
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label className="h-12 w-12 inline-flex items-center justify-center rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 cursor-pointer active:scale-[.98] transition">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await fileToDataUrl(f);
                      const { mime, b64 } = dataUrlToParts(url);
                      setAttachData({ mime, b64, url });
                    }}
                  />
                  <ImagePlus className="w-5 h-5" />
                </label>

                <input
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAssistant()}
                  placeholder="Type your question… or attach an image"
                  className="flex-1 h-12 px-4 rounded-xl bg-white/10 border border-white/15 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
                <button
                  onClick={sendAssistant}
                  disabled={!GEMINI_KEY}
                  className="h-12 px-4 rounded-xl bg-[color:var(--brand)] text-black font-medium hover:brightness-110 active:scale-[.98] transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" /> Send
                </button>
              </div>

              {attachData && (
                <div className="mt-2 text-xs text-blue-200/80 flex items-center gap-2">
                  <img
                    src={attachData.url}
                    className="w-10 h-10 rounded object-cover border border-white/10"
                  />
                  Image attached
                  <button onClick={() => setAttachData(null)} className="underline text-blue-100">
                    Remove
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* bottom nav with pearl */}
      <nav className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
        <div className="relative mx-auto w-[380px] max-w-[92vw]">
          <div className="rounded-2xl border border-white/12 bg-white/8 backdrop-blur-xl p-2 flex items-center justify-between shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <button
              onClick={() => setTab("tasks")}
              className={`flex-1 py-2 rounded-xl transition active:scale-[.98] ${
                tab === "tasks" ? "bg-[color:var(--brand)]/25 text-white" : "text-blue-100"
              }`}
              aria-label="Tasks"
              title="Tasks"
            >
              <Home className="w-5 h-5 mx-auto" />
            </button>

            <button
              onClick={() => setTab("growth")}
              className={`flex-1 py-2 rounded-xl transition active:scale-[.98] ${
                tab === "growth" ? "bg-[color:var(--brand)]/25 text-white" : "text-blue-100"
              }`}
              aria-label="Growth"
              title="Growth"
            >
              <BarChart3 className="w-5 h-5 mx-auto" />
            </button>

            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              className="w-14 h-14 -mt-8 rounded-full mx-1 border border-white/40 relative transition active:scale-[.98]"
              aria-label="Voice Assistant"
              title="Voice Assistant"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, rgba(255,255,255,.95), rgba(210,225,255,.55) 45%, rgba(160,190,255,.22) 70%, rgba(255,255,255,0) 100%)",
                boxShadow:
                  "0 14px 30px rgba(0,0,0,.35), inset -20px -20px 40px rgba(0,0,0,.18), inset 20px 20px 40px rgba(255,255,255,.25)",
                animation: "pearl-bob 6s ease-in-out infinite",
              }}
            />

            <button
              onClick={() => setTab("calendar")}
              className={`flex-1 py-2 rounded-xl transition active:scale-[.98] ${
                tab === "calendar" ? "bg-[color:var(--brand)]/25 text-white" : "text-blue-100"
              }`}
              aria-label="Calendar"
              title="Calendar"
            >
              <CalendarDays className="w-5 h-5 mx-auto" />
            </button>

            <button
              onClick={() => setTab("assistant")}
              className={`flex-1 py-2 rounded-xl transition active:scale-[.98] ${
                tab === "assistant" ? "bg-[color:var(--brand)]/25 text-white" : "text-blue-100"
              }`}
              aria-label="Assistant"
              title="Assistant"
            >
              <Sparkles className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
      </nav>

      {/* Voice overlay */}
      {voiceOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/18 bg-[rgba(20,28,45,0.62)] backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] p-4 relative">
            <button
              onClick={() => {
                setVoiceOpen(false);
                stopListening();
              }}
              className="absolute right-3 top-3 text-blue-200 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-blue-100/90 mb-3">
              <Sparkles className="w-5 h-5 text-[color:var(--brand)]" /> Voice •{" "}
              {hasWebSpeech ? (listening ? "Listening…" : "Ready") : "Not supported"}
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/5 p-3 mb-3">
              <div className="h-10 flex items-center gap-1 overflow-hidden">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm ${
                      listening ? "animate-[pulse_1.4s_ease-in-out_infinite]" : ""
                    }`}
                    style={{
                      height: listening ? `${8 + ((i * 29) % 24)}px` : "8px",
                      background: "rgba(180,210,255,0.35)",
                    }}
                  />
                ))}
              </div>
              <div className="text-sm text-blue-100/90 min-h-[1.5rem] mt-2 whitespace-pre-wrap">
                {interim ||
                  (listening
                    ? "Listening… say something"
                    : "Tap the mic below to record, or type in the Assistant tab.")}
              </div>
            </div>

            <div className="max-h-48 overflow-auto space-y-2 mb-3">
              {assistantMsgs.slice(-4).map((m) => (
                <div
                  key={m.id}
                  className={`text-xs px-3 py-2 rounded-xl border ${
                    m.role === "user"
                      ? "bg-[color:var(--brand)]/10 border-[color:var(--brand)]/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="opacity-80 whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (listening ? stopListening() : startListening())}
                  disabled={!hasWebSpeech}
                  className={`px-3 py-2 rounded-xl border transition active:scale-[.98] ${
                    listening
                      ? "bg-red-500/20 border-red-400/30 text-red-200"
                      : "bg-white/10 border-white/15 text-blue-100"
                  } hover:bg-white/15`}
                >
                  {listening ? (
                    <>
                      <MicOff className="w-4 h-4 inline" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 inline" /> Record
                    </>
                  )}
                </button>

                <button
                  onClick={() => setVoiceTTSOn((v) => !v)}
                  className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-blue-100 hover:bg-white/15 transition active:scale-[.98]"
                  title="Toggle Text-to-Speech"
                >
                  {voiceTTSOn ? (
                    <>
                      <Volume2 className="w-4 h-4 inline" /> TTS On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 inline" /> TTS Off
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!hotwordOn) {
                      setHotwordOn(true);
                      startListening({ continuous: true, forHotword: true });
                    } else {
                      setHotwordOn(false);
                      stopListening();
                    }
                  }}
                  disabled={!hasWebSpeech}
                  className={`px-3 py-2 rounded-xl border transition active:scale-[.98] ${
                    hotwordOn
                      ? "bg-[color:var(--brand)]/20 border-[color:var(--brand)]/40 text-cyan-100"
                      : "bg-white/10 border-white/15 text-blue-100"
                  } hover:bg-white/15`}
                  title="Say 'hey vlinks' to wake"
                >
                  <Sparkles className="w-4 h-4 inline" /> Hey VLinks {hotwordOn ? "On" : "Off"}
                </button>
              </div>

              <button
                onClick={() => {
                  setVoiceOpen(false);
                  setTab("assistant");
                }}
                className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-black font-medium hover:brightness-110 transition active:scale-[.98]"
              >
                Go Assistant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* local styles / design tokens */}
      <style>{`
        .theme-pearl {
          --panel: rgba(255,255,255,0.07);
          --panel-border: rgba(255,255,255,0.13);
          --text: #e8eefc;
          --brand: #61e4ff;
          --glow: 0 12px 36px rgba(120, 200, 255, 0.25);
        }
        @keyframes pearl-bob {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(0,0,0,0.3) inset !important;
          transition: background-color 9999s ease-in-out 0s !important;
        }
      `}</style>
    </div>
  );
}

/** ===== helpers for calendar block layout ===== */
function withinSlot(slot: string, start: string, end: string) {
  const s = toMinutes(start),
    e = toMinutes(end),
    row = toMinutes(slot),
    next = row + 60;
  return !(e <= row || s >= next);
}
function offsetTop(slot: string, start: string) {
  const row = toMinutes(slot);
  const s = toMinutes(start);
  const ratio = Math.max(0, Math.min(1, (s - row) / 60));
  return `${ratio * 64}px`;
}
function heightFrom(start: string, end: string) {
  const h = Math.max(30, (toMinutes(end) - toMinutes(start)) * (64 / 60));
  return `${h}px`;
}
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
