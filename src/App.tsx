// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import Account from "./components/Account";
import CalendarHub from "./components/CalendarHub";
import ToDoList from "./components/ToDoList";
import ChatPhone from "./components/ChatPhone";
import LoadingVanGogh from "./components/LoadingVanGogh";
import Security from "./components/Security";
import FeedbackWidget from "./components/FeedbackWidget";
import AuthPage from "./auth/AuthPage"; // ✅ 新增：统一处理 login / signup / forgot / reset
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
  // Views
  const [view, setView] = useState<
    "home" | "feed" | "personal" | "account" | "security" | "todo" | "lobby"
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
  const [justSignedUp, setJustSignedUp] = useState(false);
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);

  const [booting, setBooting] = useState(true);

  // Avatar
  const [avatar, setAvatar] = useState<string | null>(null);

  // Dropdowns
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [school, setSchool] = useState("School");

  // AI phone
  const [aiOpen, setAiOpen] = useState(false);

  // Music
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Anchors
  const featuresRef = useRef<HTMLDivElement>(null);
  const signupRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  // Affirm
  const [showAffirm, setShowAffirm] = useState(false);
  const [currentAffirm, setCurrentAffirm] = useState<string>("");

  // Auth form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Welcome
  const [signedUp, setSignedUp] = useState(false);

  // Keyword
  const [kw, setKw] = useState<"Breathe" | "Focus" | "Connect">("Breathe");

  // Auth mode
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Auth overlay (reset password)
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);

  const makeHeroTitle = (s: string) =>
    s === "School" ? "A Calmer Campus Life" : `A Calmer ${s} Life`;
  const nextAffirm = () => {
    const idx = Math.floor(Math.random() * AFFIRMS.length);
    setCurrentAffirm(AFFIRMS[idx]);
    setShowAffirm(true);
  };

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

  /* ---------------- Supabase session ---------------- */
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        setShowAuthOverlay(true); // ✅ 遇到密码恢复事件时显示 AuthPage reset 界面
      }
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && s?.user) {
        try {
          await ensureProfileExists();
        } catch {}
      }
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  /* ---------------- Reset link check ---------------- */
  useEffect(() => {
    const u = new URL(window.location.href);
    const isRecovery =
      u.hash.includes("type=recovery") ||
      u.search.includes("type=recovery") ||
      u.pathname === "/reset-password";
    if (isRecovery) setShowAuthOverlay(true);
  }, []);

  /* ---------------------- Render ---------------------- */
  return (
    <>
      <div className="w-full min-h-screen overflow-x-hidden">
        {/* ... 这里保持你原本的 view 切换逻辑 (home / feed / account / etc.) ... */}
      </div>

      {/* ====== Global portals ====== */}
      {createPortal(<ChatPhone open={aiOpen} onClose={() => setAiOpen(false)} />, document.body)}
      {createPortal(<QuizHub open={quizOpen} onClose={() => setQuizOpen(false)} />, document.body)}
      {createPortal(
        <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} tab={legalTab} setTab={setLegalTab} />,
        document.body
      )}
      {createPortal(
        <InstallA2HSModal
          open={showA2HS}
          onClose={() => setShowA2HS(false)}
          onInstall={async () => {
            await promptInstall();
            setShowA2HS(false);
          }}
          canOneTapInstall={!!deferredPrompt}
          isIOS={isIOS}
        />,
        document.body
      )}

      {/* ✅ Reset Password / AuthPage Overlay */}
      {createPortal(
        showAuthOverlay ? (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto p-4">
              <AuthPage />
              <button
                onClick={() => setShowAuthOverlay(false)}
                className="absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        ) : null,
        document.body
      )}

      {/* ✅ 让点击涟漪在最上层 */}
      <ClickRipples />
    </>
  );
}
