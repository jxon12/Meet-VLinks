// src/components/ChatPhone.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TarotScreen from "./TarotScreen";
import Game from "./Game";
import { askGeminiMulti, type BuddyInfo } from "../lib/gemini";
import MusicPlayer from "./MusicPlayer";
import { X, Image as Img, Send, ChevronLeft, Sun, Cloud, Moon, Plus } from "lucide-react";
import { buildMomPrompt, PERSONAS } from "../lib/momPrompt";
import { supabase } from "../lib/supabaseClient";

/* ---- DM API ---- */
import {
  getOrCreateDM,
  fetchMessages as fetchDMs,
  sendMessage as sendDMMessage,
  subscribeDM,
  type DMMessage as DBMsg,
} from "../lib/dmClient";

/* -------------------- Types -------------------- */
type Props = { open: boolean; onClose: () => void };
type Mood = "sunny" | "cloudy" | "night";
type BotMsg = { id: number | string; role: "bot" | "me"; text: string };

type DMRow = { id: string; user_a: string; user_b: string; created_at: string };
type ProfileLite = { id: string; full_name: string | null; avatar_url: string | null };

/* ---- Buddy（from Discover, inlined here） ---- */
type BuddyType = { id: string; name: string; species: string; avatar: string };

/* ---- Real world DM types ---- */
type DMContact = { id: string; name: string; avatar: string };
type ViewMsg = { id: string; from: "me" | "peer"; text: string; ts: string };

/* -------------------- Theme -------------------- */
const THEME = {
  main_text_color: "rgba(15,29,96,1)",
  italics_text_color: "rgba(90,132,212,1)",
  underline_text_color: "rgba(85,125,184,1)",
  quote_text_color: "rgba(97,119,233,1)",
  blur_tint_color: "rgba(239,239,239,0.62)",
  chat_tint_color: "rgba(255,255,255,0.60)",
  user_mes_blur_tint_color: "rgba(182,198,231,0.36)",
  bot_mes_blur_tint_color: "rgba(160,202,199,0.20)",
  shadow_color: "rgba(255,255,255,0.96)",
};

/* -------------------- Initial Buddies -------------------- */
const INITIAL_BUDDIES: BuddyType[] = [
  { id: "skylar",  name: "Skylar",  species: "dumbo octopus", avatar: "🐙" },
  { id: "louise",  name: "Louise",  species: "jellyfish",     avatar: "🪼" },
  { id: "luther",  name: "Luther",  species: "whale",         avatar: "🐋" },
  { id: "joshua",  name: "Joshua",  species: "turtle",        avatar: "🐢" },
];

/* -------------------- Helpers -------------------- */
function wallpaper(mood: Mood): React.CSSProperties {
  if (mood === "sunny") {
    return {
      background:
        "linear-gradient(180deg, rgba(230,240,255,0.75), rgba(255,255,255,0)),"
      + "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.85), rgba(255,255,255,0) 42%),"
      + "linear-gradient(180deg, #eef6ff 0%, #d9e9ff 60%, #eef6ff 100%),"
      + "#eef6ff",
      color: "#0a0f18",
    };
  }
  if (mood === "cloudy") {
    return {
      background:
        "linear-gradient(180deg, rgba(200,214,234,0.6), rgba(255,255,255,0)),"
      + "linear-gradient(180deg, #e9eef6 0%, #dbe3ee 60%, #e9eef6 100%),"
      + "#e9eef6",
      color: "#0a0f18",
    };
  }
  return {
    background:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.10), rgba(0,0,0,0) 40%),"
    + "linear-gradient(180deg, #0b1220 0%, #0a1322 60%, #08111d 100%),"
    + "#0a1322",
    color: "#eaf2ff",
  };
}

/* ---- Emotion & Safety ---- */
const SAFETY_RE =
  /(suicide|kill\s*myself|self[-\s]?harm|cutting|end\s*it|jump\s*off|die|hang\s*myself|overdose|take\s*my\s*life|自杀|轻生|不想活|想死|割腕|跳楼)/i;

function DETECT_MOOD(text: string): "tired" | "sad" | "angry" | "neutral" {
  if (!text) return "neutral";
  const t = text.toLowerCase();
  if (/(tired|exhausted|overwhelmed|burn(?:ed)?\s*out|stress|anxious)/i.test(t)) return "tired";
  if (/(sad|down|cry|lonely|depress)/i.test(t)) return "sad";
  if (/(angry|mad|pissed|frustrat|annoy|irritat|rage)/i.test(t)) return "angry";
  return "neutral";
}

const REPLIES: Record<string, { tired: string; sad: string; angry: string; neutral: string }> = {
  skylar: { tired: "Go slow, I’m here with you.", sad: "Come here, gentle hug first.", angry: "Let’s set a boundary, then unpack it together.", neutral: "I’m listening—idea or rest first?" },
  louise: { tired: "Tiny steps, steady wins.", sad: "Lean on me for a bit.", angry: "No rush—shrink the problem first.", neutral: "Spit it out—I’ll back you or keep you company." },
  luther: { tired: "Reef time—pull the sails a little.", sad: "Rise slowly—don’t get crushed by the wave.", angry: "Heavy wind? Hold the rudder steady.", neutral: "Which part do you want to start on?" },
  joshua: { tired: "Battery saver ON—go grab a micro-win 🙂", sad: "Deep breath, I got you 🫶", angry: "Dock first, then KO the boss 😎", neutral: "Want sparks, a plan, or a joke?" },
};
const GENERIC_REPLY = {
  tired: "Slower is smarter. Pick one tiny action.",
  sad: "I’m here. You can lean a little.",
  angry: "Stabilize first; split it smaller.",
  neutral: "I’m listening—want me to suggest one small move?",
};

function AvatarIcon({ avatar, className }: { avatar: string; className?: string }) {
  const isUrl = /^https?:\/\//.test(avatar);
  if (isUrl) return <img src={avatar} className={`${className || ""} object-cover`} alt="" />;
  return <span className={className}>{avatar}</span>;
}

/* ================== Vcard: chat-style “Subconscious Exploration” ================== */

type VchatMsg =
  | { id: string | number; role: "bot" | "me"; kind: "text"; text: string }
  | { id: string | number; role: "bot"; kind: "image"; url: string; title: string };

type PhotoPrompt = { id: string; url: string; title: string; cues: string[] };

const PHOTO_POOL: PhotoPrompt[] = [
  { id: "sea-dawn", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200", title: "Sea at Dawn",
    cues: ["What caught your eye first?", "Does anything here symbolize a part of you?", "If anxiety were the tide, is it rising or receding?"] },
  { id: "forest-path", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200", title: "Forest Path",
    cues: ["Where would you walk?", "What could you put down to travel lighter?", "Who might walk alongside you?"] },
  { id: "window-rain", url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200", title: "Rain on Window",
    cues: ["What do the droplets remind you of?", "Which window do you wish would open?", "If you wrote one line to yourself, what would it be?"] },
  { id: "mountain-sun", url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200", title: "Ridge Sunrise",
    cues: ["Where are you—valley or ridge?", "What ‘gear’ do you need right now?", "What’s the smallest next step?"] },
  { id: "city-night", url: "https://images.unsplash.com/photo-1499914485622-a88fac536970?q=80&w=1200", title: "City Neon",
    cues: ["Which light feels like yours?", "Do crowds charge or drain you?", "Pause or continue—what do you want?"] },
  { id: "desk-coffee", url: "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?q=80&w=1200", title: "Desk & Coffee",
    cues: ["Which item mirrors you now?", "What could be removed to make room?", "Where would you begin?"] },
  { id: "river-stone", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200", title: "River & Stones",
    cues: ["What emotion flows like the water?", "What do the stones block?", "If you float downstream, what worries you?"] },
  { id: "paper-air", url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1200", title: "Paper Airplane",
    cues: ["Who is it addressed to?", "One line you’d write on it?", "Where should it fly?"] },
];

function pickPhoto(): PhotoPrompt {
  return PHOTO_POOL[Math.floor(Math.random() * PHOTO_POOL.length)];
}

function VcardScreen({ onBack }: { onBack: () => void }) {
  const [msgs, setMsgs] = useState<VchatMsg[]>([]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"intro"|"offer"|"photo"|"reflect"|"summary">("intro");
  const [currentPhoto, setCurrentPhoto] = useState<PhotoPrompt | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Greeting + Offer in EN
    const base = Date.now();
    setMsgs([
      { id: base, role: "bot", kind: "text", text: "Hey, I’m here. Let’s steady the ship and check in with your inner weather." },
      { id: base+1, role: "bot", kind: "text", text: "Would you like a short Subconscious Exploration? I’ll show you an image, guide your reflections, then offer a gentle reading and a tiny next step." },
    ]);
    setStage("offer");
  }, []);

  useEffect(() => { setTimeout(() => bodyRef.current?.scrollTo({ top: 9e9 }), 0); }, [msgs]);

  const pushBot = (m: VchatMsg) => setMsgs(prev => [...prev, m]);
  const pushBotLines = (lines: string[]) => {
    const t0 = Date.now();
    lines.forEach((t, i) => setTimeout(()=>pushBot({ id: t0+i, role:"bot", kind:"text", text:t }), i*420));
  };

  const startExploration = () => {
    const photo = pickPhoto();
    setCurrentPhoto(photo);
    pushBot({ id: "ph:"+photo.id, role: "bot", kind: "image", url: photo.url, title: photo.title });
    pushBotLines([
      `Look at “${photo.title}”.`,
      `${photo.cues[0]}`,
      `You might also consider: ${photo.cues[1]}`
    ]);
    setStage("photo");
  };

  const askMoreCues = () => {
    if (!currentPhoto) return;
    const cue = currentPhoto.cues[2] || "What is your body sensing right now?";
    pushBot({ id: Date.now(), role: "bot", kind: "text", text: cue });
    setStage("reflect");
  };

  async function sendUser() {
    const text = input.trim();
    if (!text) return;
    const id = Date.now();
    setMsgs(p => [...p, { id, role: "me", kind: "text", text }]);
    setInput("");

    if (!currentPhoto) {
      // Offer stage decision
      if (/^(ok|yes|sure|start|begin|go|yep|yeah|好的|开始)/i.test(text)) startExploration();
      else pushBot({ id: id+1, role:"bot", kind:"text", text:"All good. We can just talk about anything on your mind." });
      return;
    }

    // With photo -> reading
    try {
      const sys = `You are a warm, concrete psychological companion. No diagnosis. Mirror key feelings, use grounded metaphors, and end with a tiny, doable next step. English only.`;
      const prompt = `
${sys}
[Context] I showed the user an image for subconscious exploration.
[Image Title] ${currentPhoto.title}
[Sample cues] ${currentPhoto.cues.join(" / ")}
[User's words about the image]
"""${text}"""
[Output rules]
- 2–3 chat bubbles, concise.
- Bubble 1: Reflect back the user's key feeling(s) + validation.
- Bubble 2: Offer a grounded metaphor/interpretation drawn from the image (no fortune-telling).
- Bubble 3 (optional): One tiny next step doable within 1 minute (start with a verb, concrete).
`.trim();
      const chunks = await askGeminiMulti(prompt, { id: "vcard", name: "Vcard", persona: "gentle" } as BuddyInfo);
      const toSend = (chunks?.length ? chunks.slice(0,3) : [
        "I hear the mix of caution and hope in what you shared—thanks for trusting me with it.",
        `If “${currentPhoto.title}” is your inner scene, it’s nudging you to narrow the frame to what’s right under your feet.`,
        "Tiny step: set a 60-second timer and jot one thing you *can* do today, even if it’s sending a single line to someone."
      ]);
      toSend.forEach((t,i)=>pushBot({ id: id+100+i, role:"bot", kind:"text", text:t }));
      pushBot({ id: id+200, role:"bot", kind:"text", text:"Want another image—or do you prefer to pause here?" });
      setStage("summary");
    } catch {
      pushBotLines([
        "I got it—it’s complex and valid.",
        `From “${currentPhoto.title}”, the message might be: don’t solve everything at once—move one pebble in the desired direction.`,
        "Tiny step: start a three-column note—“Do / Not now / Revisit”—write exactly one item in each."
      ]);
      setStage("summary");
    }
  }

  const QuickChips = () => {
    if (stage === "offer") {
      return (
        <div className="flex gap-2 px-3">
          {["Start exploration","Maybe later"].map((t,i)=>(
            <button key={i} className="winter-chip" onClick={()=> (t==="Start exploration"? startExploration() : pushBot({ id: Date.now(), role:"bot", kind:"text", text:"Got it. What small thing feels most present right now?" }))}>{t}</button>
          ))}
        </div>
      );
    }
    if (stage === "photo") {
      return (
        <div className="flex gap-2 px-3">
          <button className="winter-chip" onClick={askMoreCues}>Another prompt</button>
          <button
            className="winter-chip"
            onClick={()=>{
              const p = pickPhoto();
              setCurrentPhoto(p);
              pushBot({ id: "ph:"+p.id, role:"bot", kind:"image", url: p.url, title: p.title });
              pushBot({ id: Date.now(), role:"bot", kind:"text", text:`Take a look at “${p.title}”. First impression?` });
            }}
          >
            New image
          </button>
        </div>
      );
    }
    if (stage === "summary") {
      return (
        <div className="flex gap-2 px-3">
          <button className="winter-chip" onClick={()=>{ setStage("offer"); pushBot({ id: Date.now(), role:"bot", kind:"text", text:"Up for another round?" }); }}>
            Another round
          </button>
          <button className="winter-chip" onClick={()=>onBack()}>Back to Home</button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-full winter-page">
      <div className="relative h-11 flex items-center justify-center winter-topbar">
        <div className="text-[13px] font-medium tracking-wide">Vcard · Subconscious Exploration</div>
        <button onClick={onBack} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={onBack} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>

      <div ref={bodyRef} className="h-[calc(100%-60px-44px-40px)] overflow-y-auto px-3 py-3 space-y-4 winter-chat-bg">
        {msgs.map(m=>{
          if (m.kind==="image") {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="mr-2 w-7 h-7 grid place-items-center rounded-full text-base winter-avatar">🃏</div>
                <div className="msg-bot" style={{ padding: 8 }}>
                  <div className="mb-1 text-[12px] opacity-70">Image · {m.title}</div>
                  <img src={m.url} alt={m.title} style={{ maxWidth: 240, borderRadius: 12, display:"block" }} />
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${m.role==="me" ? "justify-end" : "justify-start"}`}>
              {m.role==="bot" && <div className="mr-2 w-7 h-7 grid place-items-center rounded-full text-base winter-avatar">🃏</div>}
              <div className={m.role==="me" ? "msg-me" : "msg-bot"}>{m.text}</div>
              {m.role==="me" && <div className="ml-2 w-7 h-7 grid place-items-center rounded-full text-base winter-avatar">🙂</div>}
            </div>
          );
        })}
      </div>

      <QuickChips />

      <div className="h-[60px] px-2 flex items-center gap-2 winter-inputbar" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="Random image"
          onClick={()=>{ const p=pickPhoto(); setCurrentPhoto(p); pushBot({ id: "ph:"+p.id, role:"bot", kind:"image", url: p.url, title: p.title }); setStage("photo"); }}>
          <Img className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendUser()}
            placeholder={stage==="offer" ? "Reply: start / later…" : "Share what the image brings up…"}
            className="w-full h-10 px-3 winter-textfield text-[14px]" />
        </div>
        <button onClick={sendUser} className="w-9 h-9 grid place-items-center rounded-full winter-send" aria-label="Send"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ================== Safety Net: Resources only (EN) ================== */
function SafetyNetScreen({ onBack }: { onBack: () => void }) {
  const RES = [
    { name: "Befrienders KL", text: "03-7627 2929", href: "tel:0376272929" },
    { name: "Talian Kasih", text: "15999 / WhatsApp 019-2615999", href: "tel:15999" },
    { name: "MIASA 24/7 Helpline", text: "1-800-18-0027", href: "tel:1800180027" },
  ];
  return (
    <div className="relative w-full h-full winter-page">
      <div className="relative h-11 flex items-center justify-center winter-topbar">
        <div className="text-[13px] font-medium tracking-wide">Safety Net</div>
        <button onClick={onBack} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={onBack} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>

      <div className="h-[calc(100%-44px-40px)] overflow-y-auto p-3 space-y-3">
        <div className="rounded-2xl p-4 winter-card text-[13px]">
          You’re not alone. If you’d like to talk to a person, try these lines (for immediate danger, call 999).
        </div>
        <div className="rounded-2xl p-4 winter-card space-y-3">
          {RES.map(r=>(
            <div key={r.name} className="flex items-center justify-between text-[13px]">
              <div><strong>{r.name}</strong> · {r.text}</div>
              <a href={r.href} className="px-2 py-1 rounded-lg winter-chip">Call</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------- ChatPhone -------------------- */
export default function ChatPhone({ open, onClose }: Props) {
  // Screen
  const [screen, setScreen] = useState<
  | "lock" | "home"
  | "vchat" | "chat"
  | "dmchat"
  | "settings" | "game" | "tarot" | "music"
  | "vcard" | "safetynet"
  >("lock");
  const [mood, setMood] = useState<Mood>("sunny");
  const [now, setNow] = useState(new Date());
  const [myId, setMyId] = useState<string | null>(null);

  // Fake battery
  const [battery, setBattery] = useState(82);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setBattery((b) => (b > 5 ? b - 1 : 100)), 30_000);
    return () => clearInterval(t);
  }, [open]);

  /* ---------- Buddy / Vchat ---------- */
  const [vchatTab, setvchatTab] = useState<"chats" | "contacts" | "me">("chats");
  const [buddies, setBuddies] = useState<BuddyType[]>(INITIAL_BUDDIES);
  const [currentBuddy, setCurrentBuddy] = useState<BuddyType | null>(null);
  const [messages, setMessages] = useState<Record<string, BotMsg[]>>({
    skylar:   [{ id: 1, role: "bot", text: "Sup y'all, I'm Skylar. What we vibin' with today?" }],
    louise:   [{ id: 1, role: "bot", text: "It's Louise, periodt. If sumn needs doin', I'm the boss, fr. If not, ily, no cap.🙂" }],
    luther:   [{ id: 1, role: "bot", text: "Luther's here fr. Boutta drop some big brain takes then get back to the main quest, no cap." }],
    joshua:   [{ id: 1, role: "bot", text: "Joshua just went online, vibing and ready to turn up the good times! 😎" }],
  });

  /* ---------- Real world Messages (Supabase) ---------- */
  const [dmContacts, setDmContacts] = useState<DMContact[]>([]);
  const [currentDM, setCurrentDM] = useState<DMContact | null>(null);
  const [dmThreads, setDmThreads] = useState<Record<string, { dmId: string; msgs: ViewMsg[] }>>({});
  const dmUnsubs = useRef<Record<string, () => void>>({});
  const [dmDraft, setDmDraft] = useState("");
  const inboxLoadedRef = useRef(false);

  const mapDB = (m: DBMsg, myIdX: string): ViewMsg => ({
    id: m.id,
    from: m.sender_id === myIdX ? "me" : "peer",
    text: m.body,
    ts: m.created_at,
  });

  const peerOf = (dm: DMRow, uid: string) => (dm.user_a === uid ? dm.user_b : dm.user_a);

  // Get my id after login
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, [open]);

  // Inbox + subscribe DMs
  useEffect(() => {
    if (!myId || inboxLoadedRef.current) return;
    inboxLoadedRef.current = true;
    initInbox(myId);

    const ch = supabase
      .channel(`dms:${myId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "dms", filter: `user_a=eq.${myId}` },
        (p) => handleNewDM(p.new as DMRow, myId)
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "dms", filter: `user_b=eq.${myId}` },
        (p) => handleNewDM(p.new as DMRow, myId)
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [myId]);

  async function handleNewDM(dm: DMRow, uid: string) {
    const peerId = peerOf(dm, uid);
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", peerId)
      .single();

    const contact: DMContact = {
      id: peerId,
      name: prof?.full_name || "Friend",
      avatar: prof?.avatar_url || "👤",
    };
    setDmContacts((prev) => (prev.some(c => c.id === contact.id) ? prev : [...prev, contact]));

    const history = await fetchDMs(dm.id);
    setDmThreads((prev) => ({
      ...prev,
      [contact.id]: { dmId: dm.id, msgs: history.map((m) => mapDB(m, uid)) },
    }));

    if (!dmUnsubs.current[dm.id]) {
      dmUnsubs.current[dm.id] = subscribeDM(dm.id, (m) => {
        const incoming = mapDB(m, uid);
        setDmThreads((prev) => {
          const cur = prev[contact.id] || { dmId: dm.id, msgs: [] };
          let base = cur.msgs;
          if (incoming.from === "me") {
            base = base.filter(x => !(x.id.startsWith("temp:") && x.from === "me" && x.text === incoming.text));
          }
          if (base.some(x => x.id === incoming.id)) return prev;
          return { ...prev, [contact.id]: { dmId: dm.id, msgs: [...base, incoming] } };
        });
      });
    }
  }

  async function initInbox(uid: string) {
    const { data: dmList, error } = await supabase
      .from("dms")
      .select("id, user_a, user_b, created_at")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order("created_at", { ascending: false });
    if (error) { console.error("load dms:", error); return; }
    const dms = (dmList || []) as DMRow[];
    if (!dms.length) return;

    const peerIds = Array.from(new Set(dms.map(dm => peerOf(dm, uid))));
    if (peerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", peerIds);
      const pmap = new Map((profs || []).map((p: ProfileLite) => [p.id, p]));
      const contacts = peerIds.map<DMContact>(pid => ({
        id: pid,
        name: pmap.get(pid)?.full_name || "Friend",
        avatar: pmap.get(pid)?.avatar_url || "👤",
      }));
      setDmContacts((prev) => {
        const had = new Set(prev.map(c => c.id));
        const add = contacts.filter(c => !had.has(c.id));
        return add.length ? [...prev, ...add] : prev;
      });
    }

    for (const dm of dms) {
      const peer = peerOf(dm, uid);
      const history = await fetchDMs(dm.id);
      setDmThreads((prev) => ({
        ...prev,
        [peer]: { dmId: dm.id, msgs: history.map(m => mapDB(m, uid)) },
      }));

      if (!dmUnsubs.current[dm.id]) {
        dmUnsubs.current[dm.id] = subscribeDM(dm.id, (m) => {
          const incoming = mapDB(m, uid);
          setDmThreads((prev) => {
            const cur = prev[peer] || { dmId: dm.id, msgs: [] };
            let base = cur.msgs;
            if (incoming.from === "me") {
              base = base.filter(x => !(x.id.startsWith("temp:") && x.from === "me" && x.text === incoming.text));
            }
            if (base.some(x => x.id === incoming.id)) return prev;
            return { ...prev, [peer]: { dmId: dm.id, msgs: [...base, incoming] } };
          });
        });
      }
    }
  }

  async function openDMWith(contact: DMContact) {
    const dm = await getOrCreateDM(contact.id);

    const uid = myId || (await supabase.auth.getUser()).data.user?.id || "";
    const history = await fetchDMs(dm.id);
    const viewMsgs = history.map((m) => mapDB(m, uid));

    setDmContacts((prev) => (prev.find((c) => c.id === contact.id) ? prev : [...prev, contact]));
    setDmThreads((prev) => ({ ...prev, [contact.id]: { dmId: dm.id, msgs: viewMsgs } }));
    setCurrentDM(contact);
    setScreen("dmchat");

    if (dmUnsubs.current[dm.id]) { dmUnsubs.current[dm.id]!(); delete dmUnsubs.current[dm.id]; }
    dmUnsubs.current[dm.id] = subscribeDM(dm.id, (m) => {
      const uid2 = myId || (supabase.auth.getUser() as any)?.data?.user?.id || "";
      const incoming = mapDB(m, uid2);
      setDmThreads((prev) => {
        const cur = prev[contact.id] || { dmId: dm.id, msgs: [] };
        let base = cur.msgs;
        if (incoming.from === "me") {
          base = base.filter(x => !(x.id.startsWith("temp:") && x.from === "me" && x.text === incoming.text));
        }
        if (base.some(x => x.id === incoming.id)) return prev;
        return { ...prev, [contact.id]: { dmId: dm.id, msgs: [...base, incoming] } };
      });
    });
  }

  useEffect(() => {
    function onOpenDM(e: Event) {
      const { peerId, peerName, peerAvatar } = (e as CustomEvent).detail || {};
      if (!peerId) return;
      openDMWith({
        id: String(peerId),
        name: peerName || "Friend",
        avatar: peerAvatar || "👤",
      }).catch(console.error);
    }
    window.addEventListener("vlinks:open-dm", onOpenDM as any);
    return () => window.removeEventListener("vlinks:open-dm", onOpenDM as any);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(dmUnsubs.current).forEach((off) => off && off());
      dmUnsubs.current = {};
    };
  }, []);

  async function sendDM() {
    const text = dmDraft.trim();
    if (!text || !currentDM) return;
    const thread = dmThreads[currentDM.id];
    if (!thread) return;

    const temp: ViewMsg = { id: "temp:" + Date.now(), from: "me", text, ts: new Date().toISOString() };
    setDmThreads((prev) => ({ ...prev, [currentDM.id]: { dmId: thread.dmId, msgs: [...(prev[currentDM.id]?.msgs || []), temp] }}));
    setDmDraft("");
    try {
      await sendDMMessage(thread.dmId, text);
    } catch (err) {
      setDmThreads((prev) => ({
        ...prev,
        [currentDM.id]: { dmId: thread.dmId, msgs: (prev[currentDM.id]?.msgs || []).filter((m) => m.id !== temp.id) },
      }));
      alert("Send failed, please try again.");
    }
  }

  const myName = "User";
  const myAvatar = "🙂";

  const bodyRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");

  // Live Island state (restored)
  const [activityOpen, setActivityOpen] = useState(true);
  const [livePreview, setLivePreview] = useState<null | { buddy: BuddyType; text: string; ts: number }>(null);

  const [safetyBanner, setSafetyBanner] = useState<string | null>(null);
  const [forceSafety, setForceSafety] = useState(false);
  const [handoffText, setHandoffText] = useState<string>("");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (open) setTimeout(() => bodyRef.current?.scrollTo({ top: 9e9 }), 0); },
    [open, screen, currentBuddy, currentDM, messages, dmThreads]);

  const MoodIcon = useMemo(() => (mood === "sunny" ? Sun : mood === "cloudy" ? Cloud : Moon), [mood]);

  /* ---------- Buddy: send ---------- */
  const personaKeyOf = (b: BuddyType): "louise" | "skylar" | "luther" | "joshua" =>
    (["louise", "skylar", "luther", "joshua"].includes(b.id) ? (b.id as any) : "skylar");

  const pushBotLines = (buddy: BuddyType, lines: string[]) => {
    const base = Date.now();
    lines.forEach((t, i) => {
      setTimeout(() => {
        setMessages((p) => ({ ...p, [buddy.id]: [...(p[buddy.id] || []), { id: base + i, role: "bot", text: t }] }));
        setLivePreview({ buddy, text: t, ts: base + i }); // update Live Island
      }, i * 480);
    });
  };

  const sendBuddy = async () => {
    const text = draft.trim();
    if (!text || !currentBuddy) return;
    const id = Date.now();
    setMessages((p) => ({ ...p, [currentBuddy.id]: [...(p[currentBuddy.id] || []), { id, role: "me", text }] }));
    setDraft("");

    if (SAFETY_RE.test(text)) {
      setSafetyBanner(
        "Befrienders KL 03-7627 2929 • Talian Kasih 15999 / WhatsApp 019-2615999 • Lifeline 1-800-273-8255 — You deserve support; you’re not alone."
      );
      pushBotLines(currentBuddy, ["I’m here. Let’s steady your breath 🫶", "Want a very tiny next step together?"]);
      return;
    }

    setIsTyping(true);
    try {
      const pk = personaKeyOf(currentBuddy);
      const persona = PERSONAS[pk].style;
      const sys = buildMomPrompt(myName, pk, "");
      const prompt = `
${sys}
[Speaker] ${currentBuddy.name} (${currentBuddy.species})
[Task] Reply in 1–3 bubbles. Prefer short sentences. If useful, propose one tiny actionable option.
[User said] """${text}"""
`.trim();
      const chunks = await askGeminiMulti(prompt, { id: currentBuddy.id, name: currentBuddy.name, persona } as BuddyInfo);
      const toSend = chunks?.length ? chunks.slice(0, 3) : ["Got it. I’m here.", "How about one small, doable step first?"];
      pushBotLines(currentBuddy, toSend);
    } catch {
      const moodDetected = DETECT_MOOD(text);
      const pack = REPLIES[currentBuddy.id] || GENERIC_REPLY;
      const baseText = pack[moodDetected] || GENERIC_REPLY.neutral;
      pushBotLines(currentBuddy, [baseText, "Want me to suggest one tiny move?"]);
    } finally {
      setIsTyping(false);
    }
  };

  /* ---------- Parallax ---------- */
  const screenRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = screenRef.current; if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--parallax-x", (x * 8).toFixed(2) + "px");
        el.style.setProperty("--parallax-y", (y * 8).toFixed(2) + "px");
        el.style.setProperty("--parallax-rot", (x * -1.2).toFixed(2) + "deg");
        el.style.setProperty("--gloss-shift", (y * -10).toFixed(2) + "px");
      });
    };
    const onLeave = () => {
      el.style.setProperty("--parallax-x", "0px"); el.style.setProperty("--parallax-y", "0px");
      el.style.setProperty("--parallax-rot", "0deg"); el.style.setProperty("--gloss-shift", "0px");
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); cancelAnimationFrame(raf); };
  }, []);

  /* ---------- UI: Status bar ---------- */
  const StatusBar = (
    <div className="absolute left-0 right-0 top-0 h-10 px-3 flex items-center justify-between pointer-events-none select-none"
         style={{ color: mood === "night" ? "#eaf2ff" : "#0a0f18" }}>
      <div className="text-[13px] opacity-85">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="flex items-center gap-2 text-[12px] opacity-80">
        <span title="signal">📶</span>
        <span title="wifi">📡</span>
        <span className="flex items-center gap-1" title="battery">
          <span style={{ display:"inline-block", width: 22, height: 12, border: "1px solid currentColor", borderRadius: 3, position:"relative" }}>
            <span style={{ position:"absolute", right:-3, top:3, width:2, height:6, background:"currentColor", borderRadius:1 }} />
            <span style={{ display:"block", height: "100%", width: `${Math.max(6, Math.min(100, battery))}%`, background:"currentColor" }} />
          </span>
          {battery}%
        </span>
      </div>
    </div>
  );

  /* ---------- Live Island (restored) ---------- */
  const LiveIsland = (
    <div className="absolute left-1/2 -translate-x-1/2 top-[14px] z-30" title="Live Activity">
      <button onClick={() => setActivityOpen(v => !v)} className="w-[140px] h-[34px] rounded-[22px] winter-island" aria-label="Toggle Live Island" />
      {activityOpen && livePreview && screen !== "vchat" && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[40px] w-[280px] rounded-2xl ios-activity-card">
          <button
            className="w-full text-left flex items-center gap-3 px-3 py-2"
            onClick={() => { setCurrentBuddy(livePreview.buddy); setScreen("chat"); }}
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 grid place-items-center overflow-hidden">
              <AvatarIcon avatar={livePreview.buddy.avatar} className="text-lg w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white/85 leading-none mb-0.5">{livePreview.buddy.name}</div>
              <div className="text-[13px] text-white truncate">{livePreview.text}</div>
            </div>
            <div className="ios-activity-btn">Open</div>
          </button>
        </div>
      )}
    </div>
  );

  /* ---------- Tabs: Vchat ---------- */
  const ContactsTab = (
    <div className="p-3 grid gap-2">
      {buddies.map((b) => (
        <button key={b.id} onClick={() => { setCurrentBuddy(b); setScreen("chat"); }}
          className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left ${mood === 'night' ? 'ocean-card' : 'winter-card'}`}>
          <div className={`w-10 h-10 grid place-items-center rounded-full text-xl overflow-hidden ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>
            <AvatarIcon avatar={b.avatar} className="w-full h-full" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[14px] font-medium">
              {b.name} <span className="text-[11px] opacity-60">· {b.species}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
  const ChatsTab = (
    <div className="p-3 space-y-2">
      {buddies.map((b) => {
        const thread = messages[b.id] || [];
        const last = thread[thread.length - 1];
        return (
          <div key={b.id} role="button" tabIndex={0}
            onClick={() => { setCurrentBuddy(b); setScreen("chat"); }}
            className={`cursor-pointer w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left ${mood === 'night' ? 'ocean-card' : 'winter-card'}`}>
            <div className={`w-10 h-10 grid place-items-center rounded-full text-xl overflow-hidden ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>
              <AvatarIcon avatar={b.avatar} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium">{b.name}</div>
              <div className="text-[12px] opacity-60 truncate">{last?.text || "Start a conversation…"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
  const MeTab = (
    <div className="p-3 space-y-3">
      <div className={`rounded-2xl p-4 flex items-center gap-3 ${mood === 'night' ? 'ocean-card' : 'winter-card'}`}>
        <div className={`w-12 h-12 grid place-items-center rounded-full text-2xl ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>{myAvatar}</div>
        <div className="flex-1">
          <div className="text-[12px] opacity-60">Nickname</div>
          <input defaultValue={myName} className={`w-full px-2 py-1 text-[14px] ${mood === 'night' ? 'ocean-input' : 'winter-textfield'}`} readOnly />
        </div>
        <button disabled className={`px-3 py-2 rounded-xl ${mood === 'night' ? 'ocean-chip' : 'winter-chip'}`}>Locked</button>
      </div>
      <div className={`rounded-2xl p-4 ${mood === 'night' ? 'ocean-card' : 'winter-card'}`}>
        <div className="text-[13px] font-medium mb-2">Live Island</div>
        <div className="text-[13px] opacity-80">Tap the pill on Home to toggle. (No preview inside the Vchat screen)</div>
      </div>
    </div>
  );

  /* ---------- Screens: Vchat ---------- */
  const vchatHeader = (
    <div className={`relative h-11 flex items-center justify-center ${mood === "night" ? "ocean-topbar" : "winter-topbar"}`}>
      <div className="text-[13px] font-medium tracking-wide">vchat</div>
      <button onClick={() => setScreen("home")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
    </div>
  );
  const vchatTabs = (
    <div className={`h-11 flex items-center justify-around text-[13px] ${mood === "night" ? "ocean-subbar" : "winter-subbar"}`}>
      {(["chats", "contacts", "me"] as const).map((t) => (
        <button key={t} onClick={() => setvchatTab(t)}
          className={`px-3 py-1.5 rounded-full ${vchatTab === t ? (mood==='night' ? 'ocean-chip' : 'winter-chip-on') : (mood==='night' ? 'ocean-chip' : 'winter-chip')}`}>
          {t === "chats" ? "Chats" : t === "contacts" ? "Contacts" : "Me"}
        </button>
      ))}
    </div>
  );
  const vchatScreen = (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      {vchatHeader}{vchatTabs}
      <div ref={bodyRef} className="h-[calc(100%-88px-40px)] overflow-y-auto">
        {vchatTab === "chats" && <div className="p-3 space-y-2">{ChatsTab}</div>}
        {vchatTab === "contacts" && ContactsTab}
        {vchatTab === "me" && MeTab}
      </div>
    </div>
  );

  const ChatScreen = currentBuddy && (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      <div className={`relative h-11 flex items-center justify-center ${mood === 'night' ? 'ocean-topbar' : 'winter-topbar'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 grid place-items-center rounded-full text-base overflow-hidden ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>
            <AvatarIcon avatar={currentBuddy.avatar} className="w-full h-full" />
          </div>
          <div className="text-[13px] font-medium tracking-wide">
            {currentBuddy.name}{isTyping ? " · typing…" : ""}
          </div>
        </div>
        <button onClick={() => setScreen("vchat")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
      {safetyBanner && (
        <div className="px-3 pt-2">
          <div className={`px-3 py-2 text-[12px] rounded-xl flex items-start gap-2 ${mood==='night'?'ocean-card':'winter-card'}`}>
            <strong className="shrink-0">Need immediate support?</strong>
            <span className="flex-1">{safetyBanner}</span>
            <button className="px-2 py-1 rounded-lg winter-chip" onClick={()=>setSafetyBanner(null)}>Close</button>
          </div>
        </div>
      )}
      <div ref={bodyRef} className={`h-[calc(100%-60px-44px-40px)] overflow-y-auto px-3 py-3 space-y-8 ${mood === 'night' ? 'winter-chat-bg ocean' : 'winter-chat-bg'}`}>
        {(messages[currentBuddy.id] || []).map((m) => (
          <div key={m.id} className={`flex ${m.role === "me" ? "justify-end" : "justify-start"}`}>
            {m.role === "bot" && (
              <div className={`mr-2 w-7 h-7 grid place-items-center rounded-full text-base overflow-hidden ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>
                <AvatarIcon avatar={currentBuddy.avatar} className="w-full h-full" />
              </div>
            )}
            <div className={`${m.role === "me" ? (mood === 'night' ? 'msg-me ocean' : 'msg-me') : (mood === 'night' ? 'msg-bot ocean' : 'msg-bot')}`}>{m.text}</div>
            {m.role === "me" && (
              <div className={`ml-2 w-7 h-7 grid place-items-center rounded-full text-base ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>{myAvatar}</div>
            )}
          </div>
        ))}
      </div>
      <div className={`h-[60px] px-2 flex items-center gap-2 ${mood === 'night' ? 'ocean-inputbar' : 'winter-inputbar'}`} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="More"><Plus className="w-5 h-5" /></button>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="Album (placeholder)"><Img className="w-5 h-5" /></button>
        <div className="flex-1">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendBuddy()}
            placeholder="Say something…" className={`w-full h-10 px-3 winter-textfield text-[14px] ${mood === 'night' ? 'ocean-input' : ''}`} />
        </div>
        <button onClick={sendBuddy} className="w-9 h-9 grid place-items-center rounded-full winter-send" aria-label="Send"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );

  /* ---------- Screens: DM Chat ---------- */
  const dmChatScreen = currentDM && (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      <div className={`relative h-11 flex items-center justify-center ${mood === 'night' ? 'ocean-topbar' : 'winter-topbar'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 grid place-items-center rounded-full text-base overflow-hidden ${mood === 'night' ? 'ocean-avatar' : 'winter-avatar'}`}>
            <AvatarIcon avatar={currentDM.avatar} className="w-full h-full" />
          </div>
        <div className="text-[13px] font-medium tracking-wide">{currentDM.name}</div>
        </div>
        <button onClick={() => setScreen("home")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
      <div ref={bodyRef} className={`h-[calc(100%-60px-44px-40px)] overflow-y-auto px-3 py-3 space-y-8 ${mood === 'night' ? 'winter-chat-bg ocean' : 'winter-chat-bg'}`}>
        {(dmThreads[currentDM.id]?.msgs || []).map(m=>(
          <div key={m.id} className={`flex ${m.from==="me" ? "justify-end" : "justify-start"}`}>
            {m.from==="peer" && (
              <div className={`mr-2 w-7 h-7 grid place-items-center rounded-full text-base overflow-hidden ${mood==='night'?'ocean-avatar':'winter-avatar'}`}>
                <AvatarIcon avatar={currentDM.avatar} className="w-full h-full" />
              </div>
            )}
            <div className={`${m.from==="me" ? (mood==='night'?'msg-me ocean':'msg-me') : (mood==='night'?'msg-bot ocean':'msg-bot')}`}>{m.text}</div>
            {m.from==="me" && (
              <div className={`ml-2 w-7 h-7 grid place-items-center rounded-full text-base ${mood==='night'?'ocean-avatar':'winter-avatar'}`}>🙂</div>
            )}
          </div>
        ))}
      </div>
      <div className={`h-[60px] px-2 flex items-center gap-2 ${mood === 'night' ? 'ocean-inputbar' : 'winter-inputbar'}`} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="More"><Plus className="w-5 h-5" /></button>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="Album (placeholder)"><Img className="w-5 h-5" /></button>
        <div className="flex-1">
          <input value={dmDraft} onChange={(e) => setDmDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendDM()}
            placeholder="Message…" className={`w-full h-10 px-3 winter-textfield text-[14px] ${mood === 'night' ? 'ocean-input' : ''}`}
            />
        </div>
        <button onClick={sendDM} className="w-9 h-9 grid place-items-center rounded-full winter-send" aria-label="Send"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );

  /* ---------- Settings ---------- */
  const SettingsScreen = (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      <div className={`relative h-11 flex items-center justify-center ${mood === 'night' ? 'ocean-topbar' : 'winter-topbar'}`}>
        <div className="text-[13px] font-medium tracking-wide">Settings</div>
        <button onClick={() => setScreen("home")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
      <div className="h-[calc(100%-44px-40px)] overflow-y-auto p-3">
        <div className={`rounded-2xl p-4 ${mood === 'night' ? 'ocean-card' : 'winter-card'}`}>
          <div className="text-[13px] font-medium mb-2">Appearance</div>
          <div className="flex items-center gap-2 text-[13px]">
            <span>Weather:</span>
            <button className="winter-chip" onClick={() => setMood(mood === "sunny" ? "cloudy" : mood === "cloudy" ? "night" : "sunny")}>
              Cycle ({mood})
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------- Home (Live Island restored) ---------- */
  const HomeScreen = (
    <div className="relative w-full h-full" style={wallpaper(mood)}>
      {StatusBar}
      {LiveIsland}
      <div className="px-10 grid grid-cols-4 gap-5 text-center select-none" style={{ paddingTop: 120 }}>
      {[
        { key: "vchat",     label: "Vchat",      action: () => { setScreen("vchat"); setvchatTab("chats"); }, emoji: "💬" },
        { key: "vcard",     label: "Vcard",      action: () => setScreen("vcard"),     emoji: "🃏" },
        { key: "safetynet", label: "Safety Net", action: () => setScreen("safetynet"), emoji: "🫶" },
        { key: "div",       label: "Divination", action: () => setScreen("tarot"), emoji: "🔮" },
        { key: "game",      label: "Game",       action: () => setScreen("game"),  emoji: "🎮" },
        { key: "music",     label: "Music",      action: () => setScreen("music"), emoji: "🎵" },
        { key: "mood",      label: "Weather",    action: () => setMood(mood === "sunny" ? "cloudy" : mood === "cloudy" ? "night" : "sunny"), emoji: "🌤" },
        { key: "settings",  label: "Settings",   action: () => setScreen("settings"), emoji: "⚙" },
        ].map((app) => (
          <button key={app.key} onClick={app.action} className="flex flex-col items-center gap-1" title={app.label}>
            <div className="ios-app"><span className="text-xl">{app.emoji}</span></div>
            <div className="ios-label">{app.label}</div>
          </button>
        ))}
      </div>
      <div className="dock-wrap">
        <div className="winter-dock w-full h-[68px] rounded-[24px]" />
        <div className="absolute inset-0 flex items-center justify-around px-6">
          {[{ title:"Music", emoji:"🎵", onClick: () => setScreen("music") }].map((i)=>(
            <button key={i.title} className="flex flex-col items-center gap-1" onClick={i.onClick} title={i.title}>
              <div className="ios-app"><span>{i.emoji}</span></div>
              <div className="ios-label">{i.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---------- Shell ---------- */
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="absolute pointer-events-auto"
        style={{ right: 16, bottom: 16, width: "min(95vw, 420px)", maxWidth: 420, aspectRatio: "9/19.5", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full winter-shell"
             style={{ borderRadius: 42, boxShadow: "0 28px 70px rgba(40,60,90,.45), inset 0 0 0 1px rgba(255,255,255,.04)", background: "linear-gradient(180deg,#0f1420 0%,#0e1422 60%,#0f1420 100%)", border: "1px solid rgba(255,255,255,.12)" }}>
          <div className="absolute" style={{ inset: 8, borderRadius: 36, background: "rgba(0,0,0,.95)" }} />
          <div
            ref={screenRef}
            className="absolute winter-screen-vignette"
            style={{ inset: 14, borderRadius: 30, overflow: "hidden", transform: "translate(var(--parallax-x,0), var(--parallax-y,0)) rotate(var(--parallax-rot,0))", transition: "transform 180ms ease, border-radius 180ms ease, inset 180ms ease", transformStyle: "preserve-3d", background: mood==='night' ? '#02070d' : '#f7f9ff', color: mood==='night' ? '#eaf2ff' : '#0a0f18' }}
          >
            <div className="gloss" />
            {mood==='night' && (
              <>
                <video className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
                       src="https://cdn.coverr.co/videos/coverr-surface-of-the-ocean-1638/1080p.mp4" autoPlay muted loop playsInline />
                <div className="absolute inset-0" style={{ background:'radial-gradient(800px 400px at 50% -10%, rgba(120,180,255,.20), rgba(0,0,0,0) 70%)' }} />
              </>
            )}

            {screen === "lock"     && HomeScreen}
            {screen === "home"     && HomeScreen}
            {screen === "vchat"    && vchatScreen}
            {screen === "chat"     && ChatScreen}
            {screen === "dmchat"   && dmChatScreen}
            {screen === "settings" && SettingsScreen}

            {screen === "game" && (
              <div style={{ height: "100%", overflow: "hidden" }}>
                {StatusBar}
                <Game onExit={() => setScreen("home")} />
              </div>
            )}

            {screen === "tarot" && (
              <TarotScreen onBack={() => { setScreen("home"); setTimeout(() => { setForceSafety(false); setHandoffText(""); }, 0); }}
                            onOpenSafety={() => { setScreen("home"); setForceSafety(false); setHandoffText(""); }}
                            forceSafety={forceSafety} handoffText={handoffText} />
            )}

            {screen === "music" && (
              <MusicPlayer
                mood={mood}
                onBack={() => setScreen("home")}
                onBuddyReact={(buddyId, text) => {
                  const buddy = buddies.find(b => b.id === buddyId) || buddies[1] || buddies[0];
                  if (!buddy) return;
                  const base = Date.now();
                  setMessages(p => ({ ...p, [buddy.id]: [...(p[buddy.id]||[]), { id: base, role: "bot", text }] }));
                  setLivePreview({ buddy, text, ts: base });
                }}
              />
            )}

            {screen === "vcard" && <VcardScreen onBack={() => setScreen("home")} />}
            {screen === "safetynet" && <SafetyNetScreen onBack={() => setScreen("home")} />}

          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        :root {
          --wb-text: ${THEME.main_text_color};
          --wb-italic: ${THEME.italics_text_color};
          --wb-underline: ${THEME.underline_text_color};
          --wb-quote: ${THEME.quote_text_color};
          --wb-blur: ${THEME.blur_tint_color};
          --wb-chat: ${THEME.chat_tint_color};
          --wb-user: ${THEME.user_mes_blur_tint_color};
          --wb-bot: ${THEME.bot_mes_blur_tint_color};
          --wb-shadow: ${THEME.shadow_color};
        }
        .winter-screen-vignette::after{ content:""; position:absolute; inset:0; border-radius:inherit; box-shadow: inset 0 12px 24px rgba(0,0,0,.18), inset 0 -12px 24px rgba(0,0,0,.12); pointer-events:none; }
        .gloss { position:absolute; inset:0; border-radius:inherit; pointer-events:none; background: linear-gradient( to bottom, rgba(255,255,255,.5), transparent 28% ); transform: translateY(var(--gloss-shift,0)); mix-blend-mode: screen; }

        .winter-island { background: rgba(0,0,0,.88); filter: saturate(110%); box-shadow: 0 10px 28px rgba(0,0,0,.45), 0 0 0 0.5px rgba(255,255,255,.06) inset; }
        .ios-activity-card{ background: rgba(20,24,34,.62); border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(18px) saturate(140%); box-shadow: 0 18px 48px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.35); padding: 6px; }
        .ios-activity-btn{ display:inline-flex; align-items:center; justify-content:center; height:28px; padding: 0 10px; border-radius: 10px; background: rgba(255,255,255,.16); color: #fff; border: 1px solid rgba(255,255,255,.25); backdrop-filter: blur(8px); }

        .winter-dock { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.45); backdrop-filter: blur(18px) saturate(140%); box-shadow: 0 14px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.55); }
        .dock-wrap{ position:absolute; left:50%; transform:translateX(-50%); bottom:58px; width:78%; height:68px; }
        .ios-app { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,255,255,.78); border: 1px solid rgba(0,0,0,.06); box-shadow: 0 10px 24px rgba(150,175,205,.25), inset 0 1px 0 rgba(255,255,255,.65); backdrop-filter: blur(14px) saturate(140%); display:grid; place-items:center; }
        .ios-label{ font-size: 11px; color: rgba(255,255,255,.95); text-shadow: 0 1px 2px rgba(0,0,0,.45); }

        .winter-page { background: var(--wb-chat); color: var(--wb-text); backdrop-filter: blur(6px); }
        .winter-topbar, .winter-subbar { background: rgba(255,255,255,.82); backdrop-filter: blur(6px); border-bottom: 1px solid rgba(0,0,0,.06); }
        .winter-icon-btn { position:absolute; top:50%; transform: translateY(-50%); width:32px;height:32px; display:grid; place-items:center; border-radius:9999px; }
        .winter-card { background: white; border: 1px solid rgba(0,0,0,.06); box-shadow: 0 8px 22px rgba(170,190,220,.25), 0 0 6px rgba(186,212,227,.25); }
        .winter-avatar { background: #eef2ff; border: 1px solid rgba(0,0,0,.08); }

        .winter-chip { background: rgba(0,0,0,.05); border: 1px solid rgba(0,0,0,.08); border-radius: 9999px; padding: 4px 10px; }
        .winter-chip-on { background: rgba(0,0,0,.08); border: 1px solid rgba(0,0,0,.10); border-radius: 9999px; padding: 4px 10px; font-weight:600; }

        .winter-inputbar { border-top: 1px solid rgba(0,0,0,.06); background: rgba(255,255,255,.82); backdrop-filter: blur(6px); }
        .winter-textfield { background: #f3f5fb; border: 1px solid rgba(0,0,0,.06); border-radius: 12px; outline: none; }
        .winter-send { background:#4253ff; color:white; }

        .msg-bot { max-width:75%; border-radius: 18px; padding: 10px 14px; font-size:14px; background: var(--wb-bot); border:1px solid rgba(0,0,0,.06); box-shadow: 0 10px 20px rgba(152,175,199,.25), 0 0 6px rgba(186,212,227,.25); }
        .msg-me  { max-width:75%; border-radius: 18px; padding: 10px 14px; font-size:14px; color:#0a0f18; background: var(--wb-user); border:1px solid rgba(0,0,0,.05); box-shadow: 0 10px 20px rgba(152,175,199,.25); }

        .winter-page.ocean, .winter-chat-bg.ocean {
          background: radial-gradient(60% 50% at 50% 0%, rgba(8,25,48,.35), rgba(2,8,16,0) 60%),
                      linear-gradient(180deg, #061222 0%, #03101c 60%, #02070d 100%);
          color: #eaf2ff;
        }
        .ocean-topbar, .ocean-subbar, .ocean-inputbar { background: rgba(10,22,38,.55); border-color: rgba(255,255,255,.1); backdrop-filter: blur(10px) saturate(120%); }
        .ocean-card { background: rgba(255,255,255,.06); border: 1px solid rgba(200,230,255,.18); }
        .ocean-avatar { background: rgba(180,210,255,.12); border: 1px solid rgba(200,230,255,.22); }
        .ocean-chip { background: rgba(255,255,255,.08); border: 1px solid rgba(200,230,255,.22); }
        .ocean-input { background: rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); color:#eaf2ff; }

        .msg-bot.ocean { color: #cfe6ff; background: rgba(120,170,255,.10); border: 1px solid rgba(160,200,255,.16);
          box-shadow: 0 10px 24px rgba(10,40,80,.35), 0 0 16px rgba(120,180,255,.18) inset; }
        .msg-me.ocean { color: #07121f; background: rgba(180,220,255,.70); border: 1px solid rgba(200,230,255,.25);
          box-shadow: 0 10px 24px rgba(20,50,90,.35), 0 0 10px rgba(200,230,255,.22); }

        .winter-island:focus-visible{ outline: 2px solid #fff; outline-offset: 2px; }
      `}</style>
    </div>
  );
}

/* -------------------- Utils -------------------- */
function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
