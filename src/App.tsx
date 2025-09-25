// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import Account from "./components/Account";
import CalendarHub from "./components/CalendarHub";
import ToDoList from "./components/ToDoList";
import ChatPhone from "./components/ChatPhone";
import LoadingVanGogh from "./components/LoadingVanGogh";
import Security from "./components/Security";
import FeedbackWidget from "./components/FeedbackWidget";
import LegalModal from "./components/LegalModal";
import InstallA2HSModal from "./components/InstallA2HSModal";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import QuizHub from "./components/QuizHub";
import LobbyWindow from "./components/LobbyWindow";
import Feed from "./components/Feed";
import PostComposer from "./components/PostComposer";
import ProfileViewer from "./components/ProfileViewer";
import { ensureProfileExists } from "./lib/profileClient";
import { createPortal } from "react-dom";
import {
  Menu,
  X,
  ChevronDown,
  Music2,
  PauseCircle,
  CheckCircle,
  Bell,
  Calendar,
  HeartHandshake,
  BookOpen,
  Sparkles,
  RefreshCw,
} from "lucide-react";

/* 👉 Supabase */
import { supabase } from "./lib/supabaseClient";
import ResetPasswordPage from "./auth/ResetPasswordPage"; // 新增
import { useAuth } from "./auth/AuthContext"; // 使用 recovery 状态

/* ---------------------- Data ---------------------- */
const SCHOOLS = ["MMU", "APU", "SUNWAY", "Taylor's"];
const AFFIRMS = [
  "I breathe in calm, I breathe out stress.",
  "Peace flows through me like water.",
  "I am grounded, present, and safe.",
  "My focus is gentle and clear.",
  "I deserve rest, clarity, and connection.",
  "I am exactly where I need to be.",
  "Each breath softens my mind.",
  "I choose to be kind to myself today.",
];

/* ---------------------- Bubbles ---------------------- */
function Bubbles() {
  const dots = [
    { left: "12%", size: 8, delay: 0 },
    { left: "25%", size: 12, delay: 2.5 },
    { left: "38%", size: 6, delay: 5.2 },
    { left: "51%", size: 10, delay: 1.1 },
    { left: "63%", size: 7, delay: 3.6 },
    { left: "76%", size: 9, delay: 6.0 },
    { left: "89%", size: 5, delay: 4.2 },
  ];
  const trails = [
    { left: "18%", base: 4, count: 4, delay: 0.8 },
    { left: "44%", base: 5, count: 3, delay: 2.2 },
    { left: "70%", base: 4, count: 5, delay: 1.6 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {dots.map((b, i) => (
        <span
          key={`d-${i}`}
          className="absolute bottom-[-10vh] rounded-full bg-white/30 backdrop-blur-sm"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            animation: `bubbleUp ${12 + i}s linear ${b.delay}s infinite`,
            filter: "drop-shadow(0 0 6px rgba(255,255,255,0.25))",
          }}
        />
      ))}
      {trails.map((t, i) =>
        Array.from({ length: t.count }).map((_, k) => (
          <span
            key={`t-${i}-${k}`}
            className="absolute bottom-[-10vh] rounded-full bg-white/25 backdrop-blur-sm"
            style={{
              left: t.left,
              width: t.base + k,
              height: t.base + k,
              animation: `bubbleUp ${14 + i + k}s linear ${t.delay + k * 0.6}s infinite`,
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))",
            }}
          />
        ))
      )}
    </div>
  );
}

/* ---------------------- Wave Divider ---------------------- */
function WaveDivider() {
  return (
    <div className="w-full overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 1440 120"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-[80px] sm:h-[120px]"
        preserveAspectRatio="none"
      >
        <path
          d="M0,64 C240,96 480,0 720,32 C960,64 1200,128 1440,96 L1440,160 L0,160 Z"
          fill="rgba(255,255,255,0.06)"
        />
      </svg>
    </div>
  );
}

/* ---------------------- Click Ripples ---------------------- */
function ClickRipples() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    let id = 0;
    const onClick = (e: MouseEvent) => {
      setRipples((rs) => [...rs, { id: id++, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setRipples((rs) => rs.slice(1)), 650);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[95]">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute block rounded-full bg-white/10"
          style={{
            left: r.x - 2,
            top: r.y - 2,
            width: 4,
            height: 4,
            animation: "ripple 650ms ease-out forwards",
            border: "1px solid rgba(255,255,255,0.25)",
            boxShadow: "0 0 20px rgba(255,255,255,0.25)",
          }}
        />
      ))}
    </div>
  );
}
/* ---------------------- App ---------------------- */
export default function App() {
  const [view, setView] = useState<
    "home" | "feed" | "personal" | "account" | "security" | "todo" | "lobby" | "reset"
  >("home");

  const [prevView, setPrevView] = useState<"home" | "feed" | "account">("home");
  const [accountBackTo, setAccountBackTo] = useState<"home" | "feed">("home");

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUid, setProfileUid] = useState<string | null>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");

  // PWA
  const { deferredPrompt, promptInstall } = useInstallPrompt();
  const [showA2HS, setShowA2HS] = useState(false);

  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);

  const [booting, setBooting] = useState(true);

  // Auth
  const { user, recovery } = useAuth();

  // Music
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ---------------- Effect: Boot ---------------- */
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1200);
    return () => clearTimeout(t);
  }, []);

  /* ---------------- Music ---------------- */
  const toggleAudio = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
      } else {
        a.volume = 0.35;
        await a.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.log("Audio toggle error:", err);
    }
  };

  /* ---------------- Handle Recovery ---------------- */
  useEffect(() => {
    if (recovery) {
      setView("reset");
    }
  }, [recovery]);

  /* ---------------- Render ---------------- */
  return (
    <>
      <div className="w-full min-h-screen overflow-x-hidden">
        {/* music */}
        <audio ref={audioRef} loop preload="auto" playsInline>
          <source
            src="https://raw.githubusercontent.com/jxon12/ulinks/main/sea-veiw-361392.mp3"
            type="audio/mpeg"
          />
        </audio>

        {booting && <LoadingVanGogh tip="Diving into VLinks" subTip="breathe • flow • renew" />}

        {/* ========= Views ========= */}
        {view === "reset" ? (
          <ResetPasswordPage />
        ) : view === "personal" ? (
          <CalendarHub />
        ) : view === "account" ? (
          <Account
            onBack={() => setView(accountBackTo)}
            onSignOut={async () => {
              await supabase.auth.signOut();
              setView("home");
            }}
          />
        ) : view === "security" ? (
          <Security onBack={() => setView("account")} />
        ) : view === "feed" ? (
          <Feed
            onBack={() => setView("home")}
            onOpenPersonal={() => {
              setPrevView("feed");
              setView("personal");
            }}
            onOpenProfile={(uid: string) => {
              if (uid === user?.id) {
                setAccountBackTo("feed");
                setView("account");
              } else {
                setProfileUid(uid);
                setProfileOpen(true);
              }
            }}
            onOpenTodo={() => setView("todo")}
            onOpenAI={() => {}}
            onOpenLobby={() => setView("lobby")}
          />
        ) : view === "todo" ? (
          <ToDoList />
        ) : view === "lobby" ? (
          <LobbyWindow onBack={() => setView(prevView)} />
        ) : (
          <div className="min-h-screen w-full text-white bg-gradient-to-b from-[#071024] via-[#0a1a2f] to-[#02060c]">
            {/* nav + hero ... 这里保持和你原来的 Home 部分一致 */}
            <h1 className="p-10 text-2xl">Welcome to VLinks Home</h1>
          </div>
        )}
      </div>

      {/* Global portals */}
      {createPortal(<ChatPhone open={false} onClose={() => {}} />, document.body)}
      {createPortal(<QuizHub open={quizOpen} onClose={() => setQuizOpen(false)} />, document.body)}
      {createPortal(
        <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} tab={legalTab} setTab={setLegalTab} />,
        document.body
      )}
      {createPortal(
        <InstallA2HSModal
          open={showA2HS}
          onClose={() => setShowA2HS(false)}
          onInstall={promptInstall}
          canOneTapInstall={!!deferredPrompt}
          isIOS={isIOS}
        />,
        document.body
      )}
      {createPortal(
        <ProfileViewer userId={profileUid || ""} open={profileOpen} onClose={() => setProfileOpen(false)} />,
        document.body
      )}
      <ClickRipples />
    </>
  );
}
