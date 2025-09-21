// src/features/pet/PortalDropdown.tsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

function usePortalRoot(id: string) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let node = document.getElementById(id);
    if (!node) { node = document.createElement("div"); node.id = id; document.body.appendChild(node); }
    setEl(node);
  }, [id]);
  return el;
}

export default function PortalDropdown<T extends string>({
  value, onChange, options, render, anchorRef,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
  render?: (v: T) => React.ReactNode;
  anchorRef: React.RefObject<HTMLButtonElement>;
}) {
  const root = usePortalRoot("game-dropdown-root");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      const btn = anchorRef.current;
      if (btn && !btn.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, anchorRef]);

  const toggle = () => {
    const btn = anchorRef.current; if (!btn) return;
    const r = btn.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    setOpen(v => !v);
  };

  return (
    <>
      <button ref={anchorRef} className="px-3 h-9 rounded-xl bg-white/10 border border-white/15 inline-flex items-center gap-1 text-sm hover:bg-white/15 active:scale-95 transition" onClick={toggle}>
        {render ? render(value) : value} <ChevronDown className="w-4 h-4" />
      </button>
      {open && root && createPortal(
        <div style={{ position:"fixed", top:pos.top, left:pos.left, width:Math.max(160, pos.width), zIndex:1000 }}
             className="rounded-xl bg-[#0B1220]/95 border border-white/15 shadow-2xl overflow-hidden">
          {options.map(opt=>(
            <button key={opt} onClick={()=>{ onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${opt===value?'text-white':'text-white/85'}`}>
              {render ? render(opt) : opt}
            </button>
          ))}
        </div>, root)}
    </>
  );
}
