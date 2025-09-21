// src/components/ChatPhone.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import TarotScreen from "./TarotScreen";
import Game from "./Game";
import { askGeminiMulti, type BuddyInfo } from "../lib/gemini";
import Discover, { type Buddy as BuddyType } from "./Discover";
import {
  X, Image as Img, Send, ChevronLeft, Sun, Cloud, Moon,
  Plus, Maximize2, Minimize2
} from "lucide-react";
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

type FeedPost = {
  id: string;
  author: BuddyType;
  caption: string;
  imageUrl?: string;
  likes: number;
  liked: boolean;
  comments: { id: string; user: { name: string; avatar: string }; text: string; ts: number }[];
  ts: number;
};

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

/* ---- 情緒&安全 ---- */
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
  skylar: { tired: "慢点来，我在呢～", sad: "抱一下，先不急。", angry: "先立界线，咱慢慢理。", neutral: "我听着，要点子还是先休息？" },
  louise: { tired: "先打个小点，稳步走。", sad: "给你靠一下，我在。", angry: "别急，先把事拆小。", neutral: "说吧，我来拍板或陪你。" },
  luther: { tired: "把帆收一收，先靠岸。", sad: "慢起浮，别被压住。", angry: "风大就稳舵，OK？", neutral: "哪一块最想先动？" },
  joshua: { tired: "省电模式开～先拿个小胜利🙂", sad: "深呼吸，我护你🫶", angry: "先停靠，再KO boss😎", neutral: "要灵感、计划，还是来个梗？" },
};
const GENERIC_REPLY = {
  tired: "先慢一点，拿个微小动作就好。",
  sad: "我在，给你一点点靠。",
  angry: "先稳，再拆小块。",
  neutral: "我听着，要我提个点子吗？",
};

function extractImage(urlish: string | undefined) {
  if (!urlish) return undefined;
  const m = urlish.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : undefined;
}

function AvatarIcon({ avatar, className }: { avatar: string; className?: string }) {
  const isUrl = /^https?:\/\//.test(avatar);
  if (isUrl) return <img src={avatar} className={`${className || ""} object-cover`} alt="" />;
  return <span className={className}>{avatar}</span>;
}

/* -------------------- ChatPhone -------------------- */
export default function ChatPhone({ open, onClose }: Props) {
  // 屏幕
  const [screen, setScreen] = useState<
    | "lock" | "home"
    | "vchat" | "chat"
    | "messages" | "dmchat"
    | "settings" | "game" | "tarot"
  >("lock");
  const [mood, setMood] = useState<Mood>("sunny");
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  // 假電量
  const [battery, setBattery] = useState(82);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setBattery((b) => (b > 5 ? b - 1 : 100)), 30_000);
    return () => clearInterval(t);
  }, [open]);

  /* ---------- Buddy / Vchat ---------- */
  const [vchatTab, setvchatTab] = useState<"chats" | "contacts" | "discover" | "me">("chats");
  const [buddies, setBuddies] = useState<BuddyType[]>(INITIAL_BUDDIES);
  const [currentBuddy, setCurrentBuddy] = useState<BuddyType | null>(null);
  const [messages, setMessages] = useState<Record<string, BotMsg[]>>({
    skylar:   [{ id: 1, role: "bot", text: "Sup y'all, I'm Skylar. What we vibin' with today?" }],
    louise:   [{ id: 1, role: "bot", text: "It's Louise, periodt. If sumn needs doin', I'm the boss, fr. If not, ily, no cap.🙂" }],
    luther:   [{ id: 1, role: "bot", text: "Luther's here fr. Boutta drop some big brain takes then get back to the main quest, no cap." }],
    joshua:   [{ id: 1, role: "bot", text: "Joshua just went online, vibing and ready to turn up the good times! 😎" }],
  });

  /* ---------- Real world Messages (接 Supabase) ---------- */
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

  // —— 登录后拿我的 id
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, [open]);

  // —— 拿到 myId 后：初始化收件箱 + 订阅 dms 插入
  useEffect(() => {
    if (!myId || inboxLoadedRef.current) return;
    inboxLoadedRef.current = true;
    initInbox(myId);

    // 订阅“有人把我包含进来的新 DM”
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  async function handleNewDM(dm: DMRow, uid: string) {
    const peerId = peerOf(dm, uid);
    // 拉对方资料
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

    // 拉历史
    const history = await fetchDMs(dm.id);
    setDmThreads((prev) => ({
      ...prev,
      [contact.id]: { dmId: dm.id, msgs: history.map((m) => mapDB(m, uid)) },
    }));

    // 订阅此 DM 的消息
    if (!dmUnsubs.current[dm.id]) {
      dmUnsubs.current[dm.id] = subscribeDM(dm.id, (m) => {
        const incoming = mapDB(m, uid);
        setDmThreads((prev) => {
          const cur = prev[contact.id] || { dmId: dm.id, msgs: [] };
          let base = cur.msgs;
          // 去掉我方临时气泡
          if (incoming.from === "me") {
            base = base.filter(x => !(x.id.startsWith("temp:") && x.from === "me" && x.text === incoming.text));
          }
          // 防重复
          if (base.some(x => x.id === incoming.id)) return prev;
          return { ...prev, [contact.id]: { dmId: dm.id, msgs: [...base, incoming] } };
        });
      });
    }
  }

  // —— 初始化：加载我参与的所有 DM，建立联系人 + 历史 + 订阅
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

    // 为每个会话：拉历史 + 建订阅
    for (const dm of dms) {
      const peer = peerOf(dm, uid);

      // 历史
      const history = await fetchDMs(dm.id);
      setDmThreads((prev) => ({
        ...prev,
        [peer]: { dmId: dm.id, msgs: history.map(m => mapDB(m, uid)) },
      }));

      // 订阅
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

  // —— 从外部（ProfileViewer）打开某个联系人 DM
  async function openDMWith(contact: DMContact) {
    const dm = await getOrCreateDM(contact.id);

    // 拉历史
    const uid = myId || (await supabase.auth.getUser()).data.user?.id || "";
    const history = await fetchDMs(dm.id);
    const viewMsgs = history.map((m) => mapDB(m, uid));

    // 更新状态
    setDmContacts((prev) => (prev.find((c) => c.id === contact.id) ? prev : [...prev, contact]));
    setDmThreads((prev) => ({ ...prev, [contact.id]: { dmId: dm.id, msgs: viewMsgs } }));
    setCurrentDM(contact);
    setScreen("dmchat");

    // 订阅
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

  // —— 接收 ProfileViewer 的事件
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


  // —— 卸载时清除订阅
  useEffect(() => {
    return () => {
      Object.values(dmUnsubs.current).forEach((off) => off && off());
      dmUnsubs.current = {};
    };
  }, []);

  // —— 发消息（含乐观气泡 & 去重由订阅回调处理）
  async function sendDM() {
    const text = dmDraft.trim();
    if (!text || !currentDM) return;
    const thread = dmThreads[currentDM.id];
    if (!thread) return;

    const temp: ViewMsg = { id: "temp:" + Date.now(), from: "me", text, ts: new Date().toISOString() };
    setDmThreads((prev) => ({ ...prev, [currentDM.id]: { dmId: thread.dmId, msgs: [...(prev[currentDM.id]?.msgs || []), temp] } }));
    setDmDraft("");
    try {
      await sendDMMessage(thread.dmId, text);
      // 真实消息将由 Realtime 推入，并替换临时气泡
    } catch (err) {
      // 回滚
      setDmThreads((prev) => ({
        ...prev,
        [currentDM.id]: { dmId: thread.dmId, msgs: (prev[currentDM.id]?.msgs || []).filter((m) => m.id !== temp.id) },
      }));
      alert("Send failed, please try again.");
    }
  }

  // 你的暱稱/頭像（Buddy 內部用）
  const myName = "User";
  const myAvatar = "🙂";

  // 滚动 & 打字（Buddy）
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");

  // Activity / Safety（buddy 用）
  const [activityOpen, setActivityOpen] = useState(true);
  const [livePreview, setLivePreview] = useState<null | { buddy: BuddyType; text: string; ts: number }>(null);
  const [safetyBanner, setSafetyBanner] = useState<string | null>(null);
  const [forceSafety, setForceSafety] = useState(false);
  const [handoffText, setHandoffText] = useState<string>("");

  // 時鐘 & 自動滾
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (open) setTimeout(() => bodyRef.current?.scrollTo({ top: 9e9 }), 0); },
    [open, screen, currentBuddy, currentDM, messages, dmThreads]);

  const MoodIcon = useMemo(() => (mood === "sunny" ? Sun : mood === "cloudy" ? Cloud : Moon), [mood]);

  /* ---------- Buddy：發送 ---------- */
  const personaKeyOf = (b: BuddyType): "louise" | "skylar" | "luther" | "joshua" =>
    (["louise", "skylar", "luther", "joshua"].includes(b.id) ? (b.id as any) : "skylar");

  const pushBotLines = (buddy: BuddyType, lines: string[]) => {
    const base = Date.now();
    lines.forEach((t, i) => {
      setTimeout(() => {
        setMessages((p) => ({ ...p, [buddy.id]: [...(p[buddy.id] || []), { id: base + i, role: "bot", text: t }] }));
        setLivePreview({ buddy, text: t, ts: base + i });
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
        "Befrienders KL 03-76272929 • Talian Kasih 15999 / WhatsApp 019-2615999 • Lifeline 1-800-273-8255 — You deserve support; you’re not alone."
      );
      pushBotLines(currentBuddy, ["我在。先稳住呼吸 🫶", "要不要给你一个很小很小的下一步？"]);
      return;
    }

    setIsTyping(true);
    try {
      const pk = personaKeyOf(currentBuddy);
      const persona = PERSONAS[pk].style;
      const sys = buildMomPrompt(myName, pk, "");
      const prompt = `
${sys}
【当前说话者】${currentBuddy.name}（${currentBuddy.species}）
【任务】用 1~3 个“气泡”回复。若非讨论，偏短句；有必要再给微动作或一个可行选项。
【对方发言】"""${text}"""
`.trim();
      const chunks = await askGeminiMulti(prompt, { id: currentBuddy.id, name: currentBuddy.name, persona } as BuddyInfo);
      const toSend = chunks?.length ? chunks.slice(0, 3) : ["收到，我在。", "先从一个最小的点开始好嘛～"];
      pushBotLines(currentBuddy, toSend);
    } catch {
      const moodDetected = DETECT_MOOD(text);
      const pack = REPLIES[currentBuddy.id] || GENERIC_REPLY;
      const baseText = pack[moodDetected] || GENERIC_REPLY.neutral;
      pushBotLines(currentBuddy, [baseText, "要不要我给你 1 个小点子？"]);
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

  /* ---------- UI：状态栏 ---------- */
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

  /* ---------- Live Island（buddy 預覽） ---------- */
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

  /* ---------- Discover：朋友圈（buddy） ---------- */
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    try { const raw = localStorage.getItem("vlinks_feed"); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("vlinks_feed", JSON.stringify(posts)); } catch {} }, [posts]);

  useEffect(() => {
    if (posts.length) return;
    (async () => {
      try {
        const r = await fetch("/data/vlinks-corpus.json");
        const corpus = await r.json();
        const entries = corpus?.entries ?? {};
        const built: FeedPost[] = Object.values(entries)
          .filter((e: any) => typeof e?.content === "string")
          .slice(0, 12)
          .map((e: any, i: number) => {
            const lines = e.content.split(/\n+/).filter((l: string) => !/文生图|随机/.test(l));
            const caption = (lines.find((l: string) => l.trim().length > 4) || "今天也要相信小浪花").slice(0, 120);
            const maybe = extractImage(e.reply || e.desc || e.content);
            const author = INITIAL_BUDDIES[i % INITIAL_BUDDIES.length];
            return {
              id: `cp_${Date.now()}_${i}`,
              author, caption, imageUrl: maybe,
              likes: Math.floor(Math.random() * 8) + 1,
              liked: false, comments: [],
              ts: Date.now() - Math.floor(Math.random()* 8*3600*1000),
            };
          });
        setPosts(built);
      } catch {
        setPosts([
          { id:"p1", author: INITIAL_BUDDIES[0], caption:"The ocean is so chill today", imageUrl: undefined, likes:3, liked:false, comments:[], ts: Date.now()-3*3600e3 },
          { id:"p2", author: INITIAL_BUDDIES[1], caption:"Bet, let's lowkey vibe.", imageUrl: undefined, likes:5, liked:false, comments:[], ts: Date.now()-8*3600e3 },
        ]);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddBuddy = (buddy: BuddyType) => {
    if (buddies.some(b => b.id === buddy.id)) return;
    setBuddies(prev => [...prev, buddy]);
    setMessages(prev => ({
      ...prev,
      [buddy.id]: [{ id: Date.now(), role: "bot", text: `Hi, I’m ${buddy.name}! Thanks for following me. Want to chat anytime.` }]
    }));
    setLivePreview({ buddy, text: `Thanks for following me!`, ts: Date.now() });
  };
  const handleOpenChat = (buddy: BuddyType) => { setCurrentBuddy(buddy); setScreen("chat"); };
  const handleBuddyDM = (buddy: BuddyType, lines: string[]) => { pushBotLines(buddy, lines); };
  const handleToggleLike = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: (p.likes||0) + (p.liked ? -1 : 1)} : p));
  };
  async function handleUserComment(postId: string, commentText: string) {
    const ts = Date.now();
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments: [...p.comments, { id: String(ts), user: { name: myName, avatar: myAvatar }, text: commentText, ts }] }
      : p));
  }

  /* ---------- Tabs：Vchat ---------- */
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
  const DiscoverTab = (
    <Discover
      mood={mood}
      myName={myName}
      myAvatar={myAvatar}
      knownBuddies={buddies}
      posts={posts}
      setPosts={setPosts}
      onAddBuddy={handleAddBuddy}
      onOpenChat={handleOpenChat}
      onBuddyDM={handleBuddyDM}
      onUserComment={handleUserComment}
      onToggleLike={handleToggleLike}
    />
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
        <div className="text-[13px] opacity-80">Tap the island pill on Lock/Home to toggle on/off.（在 vchat 页不会弹预览）</div>
      </div>
    </div>
  );

  /* ---------- Screens：Vchat ---------- */
  const vchatHeader = (
    <div className={`relative h-11 flex items-center justify-center ${mood === "night" ? "ocean-topbar" : "winter-topbar"}`}>
      <div className="text-[13px] font-medium tracking-wide">vchat</div>
      <button onClick={() => setScreen("home")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
    </div>
  );
  const vchatTabs = (
    <div className={`h-11 flex items-center justify-around text-[13px] ${mood === "night" ? "ocean-subbar" : "winter-subbar"}`}>
      {(["chats", "contacts", "discover", "me"] as const).map((t) => (
        <button key={t} onClick={() => setvchatTab(t)}
          className={`px-3 py-1.5 rounded-full ${vchatTab === t ? (mood==='night' ? 'ocean-chip' : 'winter-chip-on') : (mood==='night' ? 'ocean-chip' : 'winter-chip')}`}>
          {t === "chats" ? "Chats" : t === "contacts" ? "Contacts" : t === "discover" ? "Discover" : "Me"}
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
        {vchatTab === "discover" && DiscoverTab}
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

  /* ---------- Screens：Messages（现实私讯，仅 Chats） ---------- */
  const messagesHeader = (
    <div className={`relative h-11 flex items-center justify-center ${mood === "night" ? "ocean-topbar" : "winter-topbar"}`}>
      <div className="text-[13px] font-medium tracking-wide">Messages</div>
      <button onClick={() => setScreen("home")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={onClose} className="winter-icon-btn right-2" aria-label="Close"><X className="w-4 h-4" /></button>
    </div>
  );
  const messagesList = (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      {messagesHeader}
      {/* 去掉 Contacts 分页后的列表高度：只有一个 44px 顶栏 */}
      <div className="h-[calc(100%-44px-40px)] overflow-y-auto p-3 space-y-2">
        {dmContacts.length === 0 ? (
          <div className="text-center text-sm opacity-70 pt-8">Start a conversation!</div>
        ) : (
          dmContacts.map(c => {
            const last = (dmThreads[c.id]?.msgs || []).slice(-1)[0];
            return (
              <button key={c.id} onClick={()=>openDMWith(c)}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left ${mood==='night'?'ocean-card':'winter-card'}`}>
                <div className={`w-10 h-10 grid place-items-center rounded-full text-xl overflow-hidden ${mood==='night'?'ocean-avatar':'winter-avatar'}`}>
                  <AvatarIcon avatar={c.avatar} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium">{c.name}</div>
                  <div className="text-[12px] opacity-60 truncate">{last?.text || "Say hi 👋"}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
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
        <button onClick={() => setScreen("messages")} className="winter-icon-btn left-2" aria-label="Back"><ChevronLeft className="w-4 h-4" /></button>
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
            placeholder="Message…" className={`w-full h-10 px-3 winter-textfield text:[14px] ${mood === 'night' ? 'ocean-input' : ''}`} />
        </div>
        <button onClick={sendDM} className="w-9 h-9 grid place-items-center rounded-full winter-send" aria-label="Send"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );

  /* ---------- Settings ---------- */
  const SettingsScreen = (
    <div className={`relative w-full h-full winter-page ${mood === 'night' ? 'ocean' : ''}`}>
      {StatusBar}
      <div className={`relative h-11 flex items中心 justify-center ${mood === 'night' ? 'ocean-topbar' : 'winter-topbar'}`}>
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

  /* ---------- Home ---------- */
  const HomeScreen = (
    <div className="relative w-full h-full" style={wallpaper(mood)}>
      {StatusBar}
      {LiveIsland}
      <div className="px-10 grid grid-cols-4 gap-5 text-center select-none" style={{ paddingTop: 120 }}>
        {[
          { key: "vchat",     label: "Vchat",     action: () => { setScreen("vchat"); setvchatTab("chats"); }, emoji: "💬" },
          { key: "messages",  label: "Messages",  action: () => { setScreen("messages"); }, emoji: "✉" },
          { key: "div",       label: "Divination", action: () => setScreen("tarot"), emoji: "🔮" },
          { key: "game",      label: "Game",      action: () => setScreen("game"),  emoji: "🎮" },
          { key: "mood",      label: "Weather",   action: () => setMood(mood === "sunny" ? "cloudy" : mood === "cloudy" ? "night" : "sunny"), emoji: "🌤" },
          { key: "settings",  label: "Settings",  action: () => setScreen("settings"), emoji: "⚙" },
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
          {[
            { title:"Music",    emoji:"🎵", onClick: () => {} },
            { title:"Messages", emoji:"✉",  onClick: () => { setScreen("messages"); } },
          ].map((i)=>(
            <button key={i.title} className="flex flex-col items-center gap-1" onClick={i.onClick} title={i.title}>
              <div className="ios-app"><span>{i.emoji}</span></div>
              <div className="ios-label">{i.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---------- 容器 ---------- */
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
            {screen === "messages" && messagesList}
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
          </div>

          <div className="absolute right-2 top-2 z-40 flex items-center gap-2">
            <button onClick={() => setIsFullscreen((v) => !v)} className="h-9 w-9 grid place-items-center rounded-full bg-white/80 hover:bg-white"
                    title={isFullscreen ? "Exit full screen" : "Full screen"}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 样式（與原設計一致） */}
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
