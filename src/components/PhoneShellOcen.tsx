// PhoneShellOcean.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Wifi, Battery, Lock } from "lucide-react";

/** -------- Types -------- */
export type AppIcon = {
  id: string;          // e.g. "weixin", "settings", "phone", "safari"
  label: string;       // shown under the icon (English)
  icon?: React.ReactNode; // optional glyph or emoji
};

/** -------- Lock Guard: fixes the second-open no-lock issue -------- */
function useLockGuard(initial = true) {
  const [locked, setLocked] = useState(initial);

  useEffect(() => {
    const relock = () => setLocked(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setLocked(true);
    };
    window.addEventListener("blur", relock);
    window.addEventListener("pagehide", relock);
    window.addEventListener("beforeunload", relock);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", relock);
      window.removeEventListener("pagehide", relock);
      window.removeEventListener("beforeunload", relock);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { locked, setLocked } as const;
}

/** -------- Ocean theme tokens -------- */
const tone = {
  bg: "linear-gradient(180deg, #e7f7f6 0%, #f4fbfb 50%, #ffffff 100%)",
  glass: "rgba(255,255,255,.65)",
  glassDeep: "rgba(255,255,255,.78)",
  border: "rgba(20,70,80,.08)",
  text: "#0d2b2f",
  wave: "linear-gradient(135deg, rgba(143,223,217,.92), rgba(187,236,232,.92))",
  foam: "linear-gradient(135deg, rgba(255,255,255,.9), rgba(238,248,248,.95))",
};

const cardStyle: React.CSSProperties = {
  background: tone.glass,
  border: `1px solid ${tone.border}`,
  backdropFilter: "blur(10px)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.08)",
};

const dockStyle: React.CSSProperties = {
  ...cardStyle,
  background: tone.glassDeep,
  borderRadius: 22,
  padding: 10,
};

/** -------- Lock Screen -------- */
function fmtTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: 16,
        // ocean wallpaper using CSS only, no external assets
        background:
          "radial-gradient(1200px 600px at 50% -10%, #c9f0ec 0%, #e9f8f7 50%, #ffffff 100%)",
      }}
    >
      <button
        onClick={onUnlock}
        title="Tap to unlock"
        style={{
          ...cardStyle,
          width: 320,
          maxWidth: "92%",
          padding: 20,
          textAlign: "center",
          color: tone.text,
          background: tone.foam,
        }}
      >
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: 1 }}>
          {fmtTime(now)}
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          {now.toLocaleDateString()}
        </div>
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            marginTop: 14,
            opacity: 0.8,
          }}
        >
          <Lock size={16} /> Tap anywhere to enter Home
        </div>
      </button>
    </div>
  );
}

/** -------- Atoms -------- */
function FallbackGlyph({ label }: { label: string }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 10,
        background: tone.wave,
        display: "grid",
        placeItems: "center",
        color: tone.text,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {label.slice(0, 1)}
    </div>
  );
}

function IconTile({ app }: { app: AppIcon }) {
  return (
    <button
      title={app.label}
      style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        ...cardStyle,
        display: "grid",
        placeItems: "center",
        background: tone.foam,
      }}
      onClick={() => {
        // hook navigation here if needed
      }}
    >
      <div
        style={{
          transform: "translateY(-2px)",
          display: "grid",
          placeItems: "center",
          gap: 6,
        }}
      >
        <div style={{ width: 28, height: 28 }}>
          {app.icon ?? <FallbackGlyph label={app.label} />}
        </div>
        <div style={{ fontSize: 12, color: tone.text, opacity: 0.85 }}>
          {app.label}
        </div>
      </div>
    </button>
  );
}

function StatusBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 6px",
        color: tone.text,
      }}
    >
      <div style={{ fontSize: 12 }}>{fmtTime()}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.75 }}>
        <Wifi size={16} />
        <Battery size={16} />
      </div>
    </div>
  );
}

function OceanWidget() {
  return (
    <div
      style={{
        ...cardStyle,
        borderRadius: 20,
        overflow: "hidden",
        background: tone.wave,
        height: 150,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Sea breeze</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>Ocean mode</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Calm, fresh, minimal</div>
      </div>
      <div
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, #e7fbfb, #c9efea, #dff7f4, #e7fbfb)",
        }}
      />
    </div>
  );
}

/** -------- Home Screen -------- */
function HomeScreen({ apps, dock }: { apps: AppIcon[]; dock: AppIcon[] }) {
  const rows = useMemo(() => {
    const r: AppIcon[][] = [];
    for (let i = 0; i < apps.length; i += 4) r.push(apps.slice(i, i + 4));
    return r;
  }, [apps]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: tone.bg,
        padding: 14,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 10,
      }}
    >
      <StatusBar />
      <div style={{ display: "grid", gap: 10 }}>
        <OceanWidget />
        {rows.map((row, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: 10, justifyContent: "space-between" }}
          >
            {row.map((app) => (
              <IconTile key={app.id} app={app} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            ...dockStyle,
            width: 330,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          {dock.map((app) => (
            <IconTile key={`dock-${app.id}`} app={app} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** -------- Main Shell (export) -------- */
export default function PhoneShellOcean({
  initialApps,
  initialDock,
  startLocked = true,
}: {
  initialApps: AppIcon[];
  initialDock: AppIcon[];
  startLocked?: boolean;
}) {
  const { locked, setLocked } = useLockGuard(startLocked);

  // Keep everything. Remove only Phone and Safari by id or label.
  const filterOut = (x: AppIcon) => {
    const key = `${x.id}|${x.label}`.toLowerCase();
    return !(key.includes("phone") || key.includes("safari"));
  };

  const apps = useMemo(() => initialApps.filter(filterOut), [initialApps]);
  const dock = useMemo(() => initialDock.filter(filterOut), [initialDock]);

  return (
    <div
      style={{
        position: "relative",
        width: 375,
        height: 812,
        margin: "0 auto",
        borderRadius: 36,
        overflow: "hidden",
        border: `1px solid ${tone.border}`,
        boxShadow: "0 30px 60px rgba(0,0,0,.15)",
      }}
    >
      {locked ? <LockScreen onUnlock={() => setLocked(false)} /> : <HomeScreen apps={apps} dock={dock} />}
    </div>
  );
}

/** -------- Quick demo (optional). Remove in production. --------
import { createRoot } from "react-dom/client";
const allApps: AppIcon[] = [
  { id: "weixin", label: "WeChat" },
  { id: "settings", label: "Settings" },
  { id: "world-book", label: "World Book" },
  { id: "themes", label: "Themes" },
  { id: "music", label: "Music" },
  { id: "weibo", label: "Weibo" },
  { id: "messages", label: "Messages" },
  { id: "phone", label: "Phone" },   // removed by filter
  { id: "safari", label: "Safari" }, // removed by filter
];
const dockApps: AppIcon[] = [
  { id: "world-book", label: "World Book" },
  { id: "weixin", label: "WeChat" },
  { id: "settings", label: "Settings" },
  { id: "safari", label: "Safari" },  // removed by filter
];
createRoot(document.getElementById("root")!).render(
  <PhoneShellOcean initialApps={allApps} initialDock={dockApps} />
);
----------------------------------------------------------------- */
