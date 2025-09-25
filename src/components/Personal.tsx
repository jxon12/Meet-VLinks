import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Plus, CalendarDays, Bookmark, UserCog, Trash2 } from "lucide-react";

type Task = { id: string; title: string; done: boolean; tag?: "assignment"|"habit"|"event"; due?: string };

const LS_KEY = "vlinks_tasks_v1";

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  useEffect(()=>localStorage.setItem(LS_KEY, JSON.stringify(tasks)), [tasks]);
  return { tasks, setTasks };
}

export default function Personal() {
  const [tab, setTab] = useState<"tasks"|"saved"|"account">("tasks");
  const { tasks, setTasks } = useTasks();
  const [text, setText] = useState("");

  const toggle = (id: string) => setTasks(ts => ts.map(t => t.id===id ? {...t, done:!t.done} : t));
  const remove = (id: string) => setTasks(ts => ts.filter(t => t.id!==id));
  const add = () => {
    const title = text.trim(); if(!title) return;
    setTasks(ts => [{ id: crypto.randomUUID(), title, done:false }, ...ts]);
    setText("");
  };

  const progress = useMemo(() => {
    const total = tasks.length || 1;
    const done = tasks.filter(t=>t.done).length;
    return Math.round((done/total)*100);
  }, [tasks]);

  return (
    <div className="min-h-screen text-white relative bg-gradient-to-b from-[#060c19] via-[#0a162b] to-[#02060c]">
      {/* 顶栏 */}
      <div className="sticky top-0 z-30 h-14 px-4 flex items-center justify-between backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="font-semibold tracking-[0.18em]">PERSONAL</div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-2">
        {["tasks","saved","account"].map(k=>(
          <button key={k}
            onClick={()=>setTab(k as any)}
            className={`px-3 py-1.5 rounded-full text-sm border backdrop-blur ${tab===k?"bg-white text-black border-white":"bg-white/8 text-white/80 border-white/15"}`}>
            {k==="tasks"?"Tasks":k==="saved"?"Saved":"Account"}
          </button>
        ))}
      </div>

      {/* 内容 */}
      {tab==="tasks" && (
        <div className="px-4 py-4 pb-28">
          {/* 进度 */}
          <div className="rounded-2xl p-4 mb-3 border border-white/12 bg-white/8 backdrop-blur-2xl">
            <div className="text-sm text-white/80 mb-1">Today’s progress</div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white" style={{width:`${progress}%`}} />
            </div>
            <div className="text-xs text-white/60 mt-1">{progress}% done</div>
          </div>

          {/* 新建 */}
          <div className="flex gap-2 mb-3">
            <input
              value={text}
              onChange={e=>setText(e.target.value)}
              placeholder="Add a task… (e.g. Submit assignment, 4-7-8 breathing)"
              className="flex-1 rounded-xl bg-white/8 border border-white/15 px-3 py-2 outline-none placeholder-white/40 focus:border-white/40"
            />
            <button onClick={add} className="rounded-xl px-3 border border-white/20 bg-white text-black"><Plus className="w-4 h-4"/></button>
          </div>

          {/* 列表 */}
          <div className="space-y-2">
            {tasks.map(t=>(
              <div key={t.id} className="rounded-2xl px-3 py-2 border border-white/12 bg-white/6 backdrop-blur flex items-center justify-between">
                <button onClick={()=>toggle(t.id)} className="flex items-center gap-2">
                  {t.done ? <CheckCircle2 className="w-5 h-5"/> : <Circle className="w-5 h-5 text-white/60"/>}
                  <span className={`text-sm ${t.done?"line-through text-white/60":"text-white/90"}`}>{t.title}</span>
                </button>
                <button onClick={()=>remove(t.id)} className="text-white/60 hover:text-white"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
            {tasks.length===0 && <div className="text-sm text-white/60">No tasks yet. Add your first one ↑</div>}
          </div>

          {/* Mood Check-in 入口 */}
          <button
            onClick={()=>alert("Open mood calendar")}
            className="fixed right-4 bottom-24 grid place-items-center w-12 h-12 rounded-xl border border-white/20 bg-white/10 backdrop-blur">
            <CalendarDays className="w-5 h-5"/>
          </button>
        </div>
      )}

      {tab==="saved" && (
        <div className="px-4 py-6 text-white/70">
          <div className="flex items-center gap-2 mb-2"><Bookmark className="w-4 h-4"/><div>Saved items</div></div>
          <p className="text-sm">Show the posts/exercises you bookmarked in Home/Explore.</p>
        </div>
      )}

      {tab==="account" && (
        <div className="px-4 py-6 text-white/70">
          <div className="flex items-center gap-2 mb-2"><UserCog className="w-4 h-4"/><div>Account</div></div>
          <ul className="text-sm space-y-2">
            <li>• Avatar & nickname</li>
            <li>• School / theme / music</li>
            <li>• Privacy & data export</li>
          </ul>
        </div>
      )}
    </div>
  );
}
