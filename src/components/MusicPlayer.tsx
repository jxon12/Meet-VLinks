import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  PauseCircle,
  PlayCircle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { askGeminiMulti, type BuddyInfo } from "../lib/gemini";
import { PERSONAS } from "../lib/momPrompt";

type Props = {
  mood: "sunny" | "cloudy" | "night";
  onBack: () => void;
  onBuddyReact?: (
    buddyId: "louise" | "skylar" | "luther" | "joshua",
    text: string
  ) => void;
};

type Track = { id: string; title: string; artist: string; cover: string; src: string };

const demoTracks: Track[] = [
  {
    id: "t1",
    title: "Twilight Zone",
    artist: "Ariana Grande",
    cover:
      "https://i.scdn.co/image/ab67616d0000b2732ec9889c4127d1b6a30d9887",
    src: "https://raw.githubusercontent.com/jxon12/Image/refs/heads/main/Ariana%20Grande%20-%20twilight%20zone%20(lyric%20visualizer).mp3",
  },
  {
    id: "t2",
    title: "Heat Waves",
    artist: "Glass Animal",
    cover: "https://i1.sndcdn.com/artworks-F3xY9y6idNwD-0-t500x500.jpg",
    src: "https://raw.githubusercontent.com/jxon12/Image/refs/heads/main/Glass%20Animals%20-%20Heat%20Waves%20(Official%20Video).mp3",
  },
  {
    id: "t3",
    title: "Payphone",
    artist: "Maroon 5, Wiz Khalifa",
    cover: "https://i1.sndcdn.com/artworks-000028242476-8q2xtt-t500x500.jpg",
    src: "https://raw.githubusercontent.com/jxon12/Image/refs/heads/main/Maroon%205,%20Wiz%20Khalifa%20%20Payphone%20(Lyrics).mp3",
  },
  {
    id: "t4",
    title: "3 Strikes",
    artist: "Terror Jr",
    cover:
      "https://images.genius.com/882034f078c7bc6390e3ce1d3e2b0021.1000x1000x1.png",
    src: "https://github.com/jxon12/Image/raw/refs/heads/main/3%20Strikes.mp3",
  },
  {
    id: "t5",
    title: "Golden Hour",
    artist: "JVKE",
    cover: "https://i1.sndcdn.com/artworks-VphCeigNiaWQ-0-t500x500.jpg",
    src: "https://github.com/jxon12/Image/raw/refs/heads/main/JVKE%20-%20golden%20hour%20(official%20music%20video).mp3",
  },
  {
    id: "t6",
    title: "We are the champions",
    artist: "Queen",
    cover:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpolbtMjaqxPlzrDL6pZVnvIBoaQSArzAkTA&s",
    src: "https://github.com/jxon12/Image/raw/refs/heads/main/Queen%20-%20We%20Are%20The%20Champions%20%5BLyrics%5D.mp3",
  },
];

type Bubble = { id: string; who: "Louise"; text: string };

export default function MusicPlayer({ mood, onBack, onBuddyReact }: Props) {
  const [list] = useState<Track[]>(demoTracks);
  const [cur, setCur] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const track = list[cur];

  const getDur = () => {
    const a = audioRef.current;
    if (!a) return 0;
    if (Number.isFinite(a.duration) && a.duration > 0) return a.duration;
    try {
      if (a.seekable && a.seekable.length) return a.seekable.end(0);
    } catch {}
    return duration;
  };

  const onLoaded = () => {
    setDuration(getDur());
  };
  const onTime = () => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime);
    setDuration(getDur());
  };

  const seek = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = v;
    setProgress(v);
  };
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  };
  const prev = () => {
    setCur((c) => (c - 1 + list.length) % list.length);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
    setPlaying(true);
  };
  const next = () => {
    setCur((c) => (c + 1) % list.length);
    setTimeout(() => audioRef.current?.play().catch(() => {}), 0);
    setPlaying(true);
  };

  // 同步原生控制的播放状态
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  // buddy reactions
  const timer = useRef<number | null>(null);
  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const pushBubble = (text: string) => {
    const b: Bubble = { id: String(Date.now() + Math.random()), who: "Louise", text };
    setBubbles((prev) => [...prev, b].slice(-5));
    setTimeout(() => setBubbles((prev) => prev.filter((x) => x.id !== b.id)), 6500);
  };
  const schedule = () => {
    clearTimer();
    timer.current = window.setTimeout(async () => {
      try {
        let line = "little bubbles tickle my ears~";
        try {
          const out = await askGeminiMulti(
            `You're Louise the jellyfish, listening to "${track.title}". Reply with ONE super-short live reaction (≤20 English words), gentle, aquatic vibe. No emoji spam.`,
            {
              id: "louise",
              name: "Louise",
              persona: PERSONAS.louise.style,
            } as BuddyInfo
          );
          if (out && out[0]) line = out[0].slice(0, 64);
        } catch {}
        pushBubble(line);
        onBuddyReact?.("louise", line);
      } finally {
        schedule();
      }
    }, 10_000 + Math.floor(Math.random() * 12_000));
  };
  useEffect(() => {
    if (isPlaying) schedule();
    else clearTimer();
    return clearTimer;
  }, [isPlaying, cur]);

  const isNight = mood === "night";

  return (
    <div className={`relative w-full h-full ${isNight ? "ocean" : ""}`}>
      {/* 背景：柔和渐变 + 毛玻璃雾面层 */}
      <div className={`absolute inset-0 -z-10 glass-bg ${isNight ? "glass-bg-night" : "glass-bg-day"}`} />
      <div className="absolute inset-0 -z-10 glass-noise" aria-hidden />

      {/* Top Bar */}
      <div
        className="relative h-12 flex items-center justify-center topbar-glass"
        style={{ pointerEvents: "auto", zIndex: 5 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-medium tracking-wide select-none">Music</div>
        <button
          className="abs-left glass-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          aria-label="Back"
          style={{ pointerEvents: "auto" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 主体玻璃卡片 */}
      <div
        className="absolute inset-0 pt-16 px-5 pb-5 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-card w-full max-w-md mx-auto p-5 rounded-3xl">
          {/* 标题 */}
          <div className="text-center mb-3">
            <div className="text-[17px] font-semibold leading-tight truncate">{track.title}</div>
            <div className="text-[12px] opacity-80 truncate">{track.artist}</div>
          </div>

          {/* 封面 + 发光玻璃环 */}
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full glass-ring" />
            <img
              src={track.cover}
              alt=""
              className={`w-full h-full object-cover rounded-full ${isPlaying ? "spin-slow" : ""}`}
            />
            <div className="absolute inset-0 rounded-full pointer-events-none inner-vignette" />
          </div>

          {/* 进度条 + 时间 */}
          <div className="w-full mt-6">
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(Math.max(duration, getDur())))}
              value={Math.floor(progress)}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full glass-range"
              aria-label="Seek"
            />
            <div className="flex justify-between text-[12px] opacity-80 mt-1">
              <span>{fmt(progress)}</span>
              <span>{fmt(Math.max(duration, getDur()))}</span>
            </div>
          </div>

          {/* 控制区：圆形玻璃按钮 */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              className="glass-ctrl"
              onClick={prev}
              title="Previous"
              aria-label="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              className="glass-ctrl glass-ctrl-primary"
              onClick={toggle}
              title="Play/Pause"
              aria-label="Play/Pause"
            >
              {isPlaying ? <PauseCircle className="w-7 h-7" /> : <PlayCircle className="w-7 h-7" />}
            </button>

            <button
              className="glass-ctrl"
              onClick={next}
              title="Next"
              aria-label="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 漂浮气泡 */}
        <div className="pointer-events-none fixed left-0 right-0 bottom-16 px-4 space-y-2 z-20">
          {bubbles.map((b) => (
            <div
              key={b.id}
              className={`mx-auto max-w-[80%] text-center text-[13px] ${isNight ? "ocean-bubble" : "winter-bubble"} fadeinout`}
            >
              <span className="mr-1">🪼 Louise:</span>
              {b.text}
            </div>
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={track.src}
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTime}
        onEnded={next}
        preload="auto"
      />

      {/* 样式 */}
      <style>{`
        /* 旋转动画 */
        .spin-slow { animation: spin 14s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* 背景：昼/夜两套渐变 */
        .glass-bg {
          filter: saturate(115%);
        }
        .glass-bg-day {
          background:
            radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,.35), transparent 60%),
            radial-gradient(900px 500px at 80% 0%, rgba(160,200,255,.35), transparent 55%),
            linear-gradient(180deg, #e9f1ff 0%, #cfe0ff 40%, #c7d7ff 100%);
        }
        .glass-bg-night {
          background:
            radial-gradient(1100px 600px at 15% -10%, rgba(90,140,255,.20), transparent 60%),
            radial-gradient(900px 500px at 85% 0%, rgba(20,80,200,.25), transparent 55%),
            linear-gradient(180deg, #0a1220 0%, #0e1a2e 50%, #0a1626 100%);
        }
        .glass-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          position: absolute; inset: 0; pointer-events: none;
        }

        /* 顶栏玻璃 */
        .topbar-glass {
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          background: rgba(255,255,255,0.18);
          border-bottom: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 2px 18px rgba(0,0,0,0.10) inset;
        }
        .abs-left { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }
        .glass-icon-btn {
          width: 34px; height: 34px; display: grid; place-items: center;
          border-radius: 12px;
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.35);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .glass-icon-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.12); }

        /* 卡片玻璃容器 */
        .glass-card {
          backdrop-filter: blur(18px) saturate(125%);
          -webkit-backdrop-filter: blur(18px) saturate(125%);
          background: rgba(255,255,255,0.20);
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.5),
            inset 0 -1px 0 rgba(0,0,0,0.05);
          color: ${/* 适配夜间可读性 */""} #0a0f18;
        }

        /* 封面外环玻璃发光 */
        .glass-ring {
          background:
            radial-gradient(closest-side, rgba(255,255,255,.65), rgba(255,255,255,.08) 60%, transparent 62%),
            conic-gradient(from 0deg, rgba(120,180,255,.45), rgba(255,255,255,.0) 45%, rgba(255,180,220,.45), rgba(255,255,255,.0) 70%, rgba(150,255,200,.4), rgba(255,255,255,.0) 100%);
          filter: blur(10px) saturate(130%);
          border-radius: 9999px;
        }
        .inner-vignette { box-shadow: inset 0 0 80px rgba(0,0,0,.35); border-radius: 9999px; }

        /* 圆形玻璃按钮 */
        .glass-ctrl {
          width: 56px; height: 56px; border-radius: 9999px;
          display: grid; place-items: center;
          background: rgba(255,255,255,0.22);
          border: 1px solid rgba(255,255,255,0.45);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.20),
            inset 0 1px 0 rgba(255,255,255,0.6);
          transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
          color: #0a0f18;
        }
        .glass-ctrl:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(0,0,0,.22); }
        .glass-ctrl:active { transform: translateY(0); }
        .glass-ctrl-primary {
          width: 68px; height: 68px;
          background: rgba(255,255,255,0.28);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow:
            0 10px 28px rgba(0,0,0,0.25),
            0 0 0 6px rgba(120,170,255,0.15);
        }

        /* 玻璃进度条 */
        .glass-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px; width: 100%;
          background:
            linear-gradient(90deg, rgba(120,170,255,.9), rgba(180,255,220,.9)) 0/var(--_fill,0%) 100% no-repeat,
            rgba(255,255,255,0.20);
          border: 1px solid rgba(255,255,255,0.45);
          border-radius: 999px;
          backdrop-filter: blur(8px) saturate(120%);
          -webkit-backdrop-filter: blur(8px) saturate(120%);
          box-shadow: inset 0 2px 8px rgba(0,0,0,.15), 0 2px 10px rgba(0,0,0,.08);
        }
        .glass-range:focus { outline: none; }
        /* WebKit thumb */
        .glass-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px; height: 18px; border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, #fff, #e6f0ff 60%, #cfe0ff);
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow:
            0 0 0 6px rgba(120,170,255,.25),
            0 8px 20px rgba(0,0,0,.25),
            inset 0 1px 0 rgba(255,255,255,.9);
          cursor: pointer;
          margin-top: -4px;
        }
        /* Firefox track & thumb */
        .glass-range::-moz-range-track {
          height: 10px; border-radius: 999px; background: transparent;
        }
        .glass-range::-moz-range-progress {
          height: 10px; border-radius: 999px;
          background: linear-gradient(90deg, rgba(120,170,255,.95), rgba(180,255,220,.95));
        }
        .glass-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, #fff, #e6f0ff 60%, #cfe0ff);
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow:
            0 0 0 6px rgba(120,170,255,.25),
            0 8px 20px rgba(0,0,0,.25),
            inset 0 1px 0 rgba(255,255,255,.9);
          cursor: pointer;
        }

        /* 根据当前值填充长度（仅 WebKit） */
        .glass-range::-webkit-slider-runnable-track {
          height: 10px; border-radius: 999px; background: transparent;
        }
        .glass-range { --_fill: calc(${Math.floor((progress / Math.max(1, Math.max(duration, getDur()))) * 100)}%); }

        /* 原有气泡样式，夜间版带玻璃 */
        .winter-bubble{
          display:inline-block; background: rgba(255,255,255,.90); color:#0a0f18;
          border:1px solid rgba(0,0,0,.08); border-radius: 14px; padding: 8px 12px;
          box-shadow: 0 8px 20px rgba(150,175,205,.25);
        }
        .ocean-bubble{
          display:inline-block; background: rgba(10,22,38,.55); color:#eaf2ff;
          border:1px solid rgba(200,230,255,.18); border-radius: 14px; padding: 8px 12px;
          box-shadow: 0 10px 24px rgba(10,40,80,.35), 0 0 16px rgba(120,180,255,.18) inset;
          backdrop-filter: blur(8px) saturate(120%);
        }
        .fadeinout{ animation: fadeinout 6.5s ease forwards; }
        @keyframes fadeinout{
          0%{opacity:0; transform: translateY(6px)}
          10%{opacity:1; transform: translateY(0)}
          80%{opacity:1}
          100%{opacity:0; transform: translateY(-6px)}
        }
      `}</style>
    </div>
  );
}

function fmt(v: number){
    const s = Math.floor(v || 0);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, "0");
    return `${m}:${ss}`;
  }
  
