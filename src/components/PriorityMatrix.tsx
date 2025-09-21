import React from "react";
import type { Task, Quadrant } from "../types/task";

type Props = {
  tasks: Task[];
  onAssign: (id: string, q: Quadrant) => void;
};

const cells: {key: Quadrant; title: string; sub: string;}[] = [
  { key:"Q1", title:"Urgent & Important", sub:"Do now" },
  { key:"Q2", title:"Not Urgent, Important", sub:"Schedule" },
  { key:"Q3", title:"Urgent, Not Important", sub:"Delegate" },
  { key:"Q4", title:"Not Urgent & Not Important", sub:"Drop" },
];

export default function PriorityMatrix({ tasks, onAssign }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map(c => {
        const list = tasks.filter(t => t.quadrant===c.key && !t.done);
        return (
          <div key={c.key} className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-3">
            <div className="text-sm font-medium">{c.title}</div>
            <div className="text-xs text-white/60 mb-2">{c.sub}</div>
            <div className="space-y-2">
              {list.length===0 ? (
                <div className="text-xs text-white/50">Empty</div>
              ) : list.map(t => (
                <button key={t.id}
                  onClick={()=>{
                    // 循环分配到下一个象限，手感不错
                    const order: Quadrant[]=["Q1","Q2","Q3","Q4"];
                    const idx = order.indexOf(t.quadrant||"Q1");
                    onAssign(t.id, order[(idx+1)%4]);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15"
                >
                  <div className="text-sm">{t.title}</div>
                  {t.dueAt && <div className="text-[11px] text-white/60">{new Date(t.dueAt).toLocaleString()}</div>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
