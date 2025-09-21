import React, { useEffect, useMemo, useRef, useState } from "react";
type Props = { onFinish?: () => void; };
export default function Pomodoro({ onFinish }: Props) {
  const [mode, setMode] = useState<"focus"|"break">("focus");
  const [sec, setSec] = useState(25*60); // 25分钟
  const timerRef = useRef<number | null>(null);
  const running = useRef(false);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const start = () => {
    if (running.current) return;
    running.current = true;
    timerRef.current = window.setInterval(() => {
      setSec(s => {
        if (s>0) return s-1;
        // 切换
        const nextMode = mode === "focus" ? "break" : "focus";
        setMode(nextMode);
        const nextSec = nextMode === "focus" ? 25*60 : 5*60;
        if (onFinish && nextMode==="break") onFinish();
        return nextSec;
      });
      return 0; // TS 满意用不到
    });
  };
  const pause = () => { running.current=false; if (timerRef.current) window.clearInterval(timerRef.current); };
  const reset = () => { pause(); setMode("focus"); setSec(25*60); };

  const mmss = useMemo(() => {
    const m = Math.floor(sec/60).toString().padStart(2,"0");
    const s = (sec%60).toString().padStart(2,"0");
    return `${m}:${s}`;
  },[sec]);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4 text-center">
      <div className="text-xs uppercase tracking-widest text-white/70">{mode==="focus"?"Focus":"Break"}</div>
      <div className="text-4xl font-semibold mt-1">{mmss}</div>
      <div className="mt-3 flex justify-center gap-2">
        <button onClick={start} className="px-4 h-9 rounded-full bg-white text-black text-sm">Start</button>
        <button onClick={pause} className="px-4 h-9 rounded-full border border-white/20 bg-white/10 text-sm">Pause</button>
        <button onClick={reset} className="px-4 h-9 rounded-full border border-white/20 bg-white/10 text-sm">Reset</button>
      </div>
    </div>
  );
}
