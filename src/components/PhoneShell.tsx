import React, { useEffect, useMemo, useRef, useState } from "react";
import PhoneShell from "./PhoneShell";
import { Sun, Cloud, Moon, ChevronLeft, X, Send, Image as Img, Plus, Trash2 } from "lucide-react";
import TarotScreen from "./TarotScreen";
import Game from "./Game";
import Discover, { type Buddy as BuddyType } from "./Discover";
// ====== 你现有的工具/类型（保持不动） ======
type Props = { open: boolean; onClose: () => void };
type Mood = "sunny" | "cloudy" | "night";
type Message = { id: number; role: "bot" | "me"; text: string };

const INITIAL_BUDDIES: BuddyType[] = [
  { id: "skylar",  name: "Skylar",  species: "dumbo octopus", avatar: "🐙" },
  { id: "louise",  name: "Louise",  species: "jellyfish",     avatar: "🪼" },
  { id: "luther",  name: "Luther",  species: "whale",         avatar: "🐋" },
  { id: "Joshua",  name: "Joshua",  species: "turtle",        avatar: "🐢" },
];

const THEME = { main_text_color:"#152060" };

export default function ChatPhone({ open, onClose }: Props) {
  // ---------- 全局小状态 ----------
  const [screen, setScreen] = useState<"lock"|"home"|"vchat"|"chat"|"settings"|"game"|"tarot">("lock");
  const [mood, setMood] = useState<Mood>("sunny");
  const [now, setNow] = useState(new Date());
  const [vchatTab, setvchatTab] = useState<"chats"|"contacts"|"discover"|"me">("chats");
  const [buddies, setBuddies] = useState<BuddyType[]>(INITIAL_BUDDIES);
  const [currentBuddy, setCurrentBuddy] = useState<BuddyType|null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    skylar:[{id:1,role:"bot",text:"Hi~~ I'm Skylar. What's brewing in that brilliant mind of yours?"}],
    louise:[{id:1,role:"bot",text:"Hi!! I’m Louise. What's the vibe today?"}],
    luther:[{id:1,role:"bot",text:"I’m Luther. I’m here with you. Take your time."}],
    Joshua:[{id:1,role:"bot",text:"Yo, Joshua here. Want a joke or a chat? 😎"}],
  });
  const [draft, setDraft] = useState("");
  const [activityOpen, setActivityOpen] = useState(true);
  const [livePreview, setLivePreview] = useState<null | { buddy: BuddyType; text: string; ts: number }>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [myName, setMyName] = useState("User");
  const [myAvatar, setMyAvatar] = useState("🙂");
  const [plusOpen, setPlusOpen] = useState(false);
  const [memories, setMemories] = useState<Record<string, {id:number;text:string;ts:number}[]>>({
    skylar:[], louise:[], luther:[], Joshua:[],
  });
  const [newMemory, setNewMemory] = useState("");

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30*1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{ if(open) setTimeout(()=>bodyRef.current?.scrollTo({top:9e9}),0); },
    [open,screen,currentBuddy,messages,plusOpen]);

  const MoodIcon = useMemo(()=> mood==="sunny"?Sun : mood==="cloudy"?Cloud : Moon, [mood]);

  // ---------- 发送（用你原来的快速回复逻辑） ----------
  const send = () => {
    const text = draft.trim(); if(!text || !currentBuddy) return;
    const id = Date.now();
    setMessages(p=>({...p,[currentBuddy.id]:[...(p[currentBuddy.id]||[]),{id,role:"me",text}]}));
    setDraft("");
    setTimeout(()=>{
      const reply = `Got it, ${myName}. Let's take one tiny step together.`;
      const id2 = Date.now()+1;
      setMessages(p=>({...p,[currentBuddy.id]:[...(p[currentBuddy.id]||[]),{id:id2,role:"bot",text:reply}]}));
      setLivePreview({buddy: currentBuddy, text: reply, ts:id2});
    }, 500);
  };

  // ---------- 灵动岛内容 ----------
  const Island = activityOpen && livePreview ? (
    <div className="w-[280px] rounded-2xl bg-[rgba(20,24,34,.62)] text-white border border-white/20 backdrop-blur-md shadow-[0_18px_40px_rgba(0,0,0,.35)] p-2">
      <button
        className="w-full text-left flex items-center gap-3 px-2 py-1.5"
        onClick={()=>{ setCurrentBuddy(livePreview.buddy); setScreen("chat"); }}
      >
        <div className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center"><span className="text-lg">{livePreview.buddy.avatar}</span></div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-white/90 leading-none mb-0.5">{livePreview.buddy.name}</div>
          <div className="text-[13px] truncate">{livePreview.text}</div>
        </div>
        <div className="px-2 py-1 rounded-md bg-white/15 border border-white/25">Open</div>
      </button>
    </div>
  ) : null;

  // ---------- 锁屏（用他的风格） ----------
  function wallpaper(): React.CSSProperties {
    if(mood==="sunny") return {background:"linear-gradient(180deg, rgba(230,240,255,.75),transparent), radial-gradient(circle at 30% 20%, rgba(255,255,255,.85), transparent 42%), linear-gradient(180deg,#eef6ff 0%,#d9e9ff 60%,#eef6ff 100%)"};
    if(mood==="cloudy") return {background:"linear-gradient(180deg, rgba(200,214,234,.6),transparent), linear-gradient(180deg,#e9eef6 0%,#dbe3ee 60%,#e9eef6 100%)"};
    return {background:"radial-gradient(circle at 30% 20%, rgba(255,255,255,.10), transparent 40%), linear-gradient(180deg,#0b1220 0%,#0a1322 60%,#08111d 100%)", color:"#eaf2ff"};
  }

  const LockScreen = (
    <div className="relative w-full h-full select-none" style={wallpaper()}>
      <div className="absolute inset-0 grid place-items-center px-6">
        <div className="text-center">
          <div className="text-sm opacity-70 mb-1">
            {now.toLocaleDateString(undefined,{ month:"long", day:"numeric", weekday:"long" })}
          </div>
          <div className="text-[76px] leading-none font-semibold tracking-tight" style={{ color: THEME.main_text_color }}>
            {now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false })}
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 w-full flex flex-col items-center gap-3">
        <button onClick={()=>setScreen("home")} className="px-4 py-1.5 rounded-full text-[13px] bg-white/85 border border-black/10 shadow">Slide / tap to unlock</button>
        <button onClick={()=>setMood(mood==="sunny"?"cloudy":mood==="cloudy"?"night":"sunny")} className="px-4 py-1.5 rounded-full text-[13px] bg-white/85 border border-black/10 shadow flex items-center gap-2">
          <MoodIcon className="w-4 h-4"/> Mood weather
        </button>
      </div>
    </div>
  );

  // ---------- 首页（你的九宫格 + 灵动岛） ----------
  const HomeScreen = (
    <div className="relative w-full h-full" style={wallpaper()}>
      {/* 灵动岛内容插槽 */}
      {/* PhoneShell 会画出“黑色药丸”，我们只把内容塞进去 */}
      {/* Live island 在 PhoneShell 的 island prop 传入 */}
      <div className="px-10 grid grid-cols-4 gap-6 text-center select-none" style={{ paddingTop: 120 }}>
        {[
          { key:"vchat", label:"Vchat",      action:()=>setScreen("vchat"), emoji:"💬" },
          { key:"div",   label:"Divination", action:()=>setScreen("tarot"), emoji:"🔮" },
          { key:"game",  label:"Game",       action:()=>setScreen("game"),  emoji:"🎮" },
          { key:"weather",label:"Weather",   action:()=>setMood(mood==="sunny"?"cloudy":mood==="cloudy"?"night":"sunny"), emoji:"🌤" },
          { key:"settings",label:"Settings", action:()=>setScreen("settings"), emoji:"⚙️" },
          { key:"phone", label:"Phone",      action:()=>{}, emoji:"📞" },
          { key:"safari",label:"Safari",     action:()=>{}, emoji:"🧭" },
          { key:"music", label:"Music",      action:()=>{}, emoji:"🎵" },
          { key:"msg",   label:"Messages",   action:()=>{}, emoji:"✉️" },
        ].map(app=>(
          <button key={app.key} onClick={app.action} className="flex flex-col items-center gap-1">
            <div className="w-[56px] h-[56px] rounded-2xl bg-white/85 border border-black/10 grid place-items-center shadow">
              <span className="text-xl">{app.emoji}</span>
            </div>
            <div className="text-[13px]">{app.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  // ---------- 简化的 Vchat/Chat/Settings ----------
  const vchatHeader = (
    <div className="relative h-11 flex items-center justify-center bg-white/85 border-b border-black/10">
      <div className="text-[13px] font-medium tracking-wide">vchat</div>
      <button onClick={()=>setScreen("home")} className="absolute left-2 top-1.5 p-1.5 rounded hover:bg-black/5" aria-label="Back"><ChevronLeft className="w-4 h-4"/></button>
      <button onClick={onClose} className="absolute right-2 top-1.5 p-1.5 rounded hover:bg-black/5" aria-label="Close"><X className="w-4 h-4"/></button>
    </div>
  );

  const ContactsTab = (
    <div className="p-3 grid gap-2">
      {buddies.map(b=>(
        <button key={b.id} onClick={()=>{setCurrentBuddy(b); setScreen("chat");}}
          className="w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-left bg-white border border-black/10 shadow">
          <div className="w-10 h-10 grid place-items-center rounded-full bg-[#eef2ff] border border-black/10 text-xl">{b.avatar}</div>
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
      {buddies.map(b=>{
        const thread = messages[b.id]||[]; const last = thread[thread.length-1];
        return (
          <div key={b.id} role="button" tabIndex={0}
            onClick={()=>{setCurrentBuddy(b); setScreen("chat");}}
            className="cursor-pointer w-full flex items-center gap-3 rounded-2xl px-3 py-2 bg-white border border-black/10 shadow">
            <div className="w-10 h-10 grid place-items-center rounded-full bg-[#eef2ff] border border-black/10 text-xl">{b.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium">{b.name}</div>
              <div className="text-[12px] opacity-60 truncate">{last?.text || "Start a conversation…"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const vchatTabs = (
    <div className="h-11 flex items-center justify-around text-[13px] bg-white/85 border-b border-black/10">
      {(["chats","contacts","discover","me"] as const).map(t=>(
        <button key={t} onClick={()=>setvchatTab(t)}
          className={`px-3 py-1.5 rounded-full ${vchatTab===t?"bg-black/10":"bg-black/5"}`}>
          {t==="chats"?"Chats":t==="contacts"?"Contacts":t==="discover"?"Discover":"Me"}
        </button>
      ))}
    </div>
  );

  const DiscoverTab = (
    <Discover
      mood={mood}
      myName={myName}
      myAvatar={myAvatar}
      knownBuddies={buddies}
      onAddBuddy={(buddy)=>{
        if(buddies.some(b=>b.id===buddy.id)) return;
        setBuddies(p=>[...p,buddy]);
        setMessages(p=>({
          ...p,
          [buddy.id]:[{id:Date.now(),role:"bot",text:`Hi, I’m ${buddy.name}! Thanks for following me. Want to chat anytime.`}]
        }));
        setLivePreview({buddy, text:"Thanks for following me!", ts:Date.now()});
      }}
      onOpenChat={(buddy)=>{ setCurrentBuddy(buddy); setScreen("chat"); }}
      onBuddyDM={(buddy, lines)=>{ // 简单模拟两条 bot 消息
        const base=Date.now();
        lines.forEach((t,i)=>{
          setTimeout(()=>{
            setMessages(p=>({...p,[buddy.id]:[...(p[buddy.id]||[]),{id:base+i,role:"bot",text:t}]}));
            setLivePreview({buddy,text:t,ts:base+i});
          }, i*500);
        });
      }}
    />
  );

  const MeTab = (
    <div className="p-3 space-y-3">
      <div className="rounded-2xl p-4 flex items-center gap-3 bg-white border border-black/10 shadow">
        <div className="w-12 h-12 grid place-items-center rounded-full text-2xl bg-[#eef2ff] border border-black/10">{myAvatar}</div>
        <div className="flex-1">
          <div className="text-[12px] opacity-60">Nickname</div>
          <input value={myName} onChange={(e)=>setMyName(e.target.value)}
            className="w-full px-2 py-1 text-[14px] bg-white border border-black/10 rounded" />
        </div>
        <button onClick={()=>setMyAvatar(prompt("Enter an emoji:", myAvatar || "🙂") || myAvatar)}
          className="px-3 py-2 rounded-xl bg-black/5 border border-black/10">Change</button>
      </div>
    </div>
  );

  const vchatScreen = (
    <div className="relative w-full h-full bg-white/60">
      {vchatHeader}
      {vchatTabs}
      <div ref={bodyRef} className="h-[calc(100%-88px)] overflow-y-auto">
        {vchatTab==="chats" && ChatsTab}
        {vchatTab==="contacts" && ContactsTab}
        {vchatTab==="discover" && DiscoverTab}
        {vchatTab==="me" && MeTab}
      </div>
    </div>
  );

  const ChatScreen = currentBuddy && (
    <div className="relative w-full h-full bg-white/60">
      <div className="relative h-11 flex items-center justify-center bg-white/85 border-b border-black/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 grid place-items-center rounded-full text-base bg-[#eef2ff] border border-black/10">{currentBuddy.avatar}</div>
          <div className="text-[13px] font-medium tracking-wide">{currentBuddy.name}</div>
        </div>
        <button onClick={()=>setScreen("vchat")} className="absolute left-2 top-1.5 p-1.5 rounded hover:bg-black/5"><ChevronLeft className="w-4 h-4"/></button>
        <button onClick={onClose} className="absolute right-2 top-1.5 p-1.5 rounded hover:bg-black/5"><X className="w-4 h-4"/></button>
      </div>

      <div ref={bodyRef} className="h-[calc(100%-60px-44px)] overflow-y-auto px-3 py-3 space-y-6"
           style={{ background:"linear-gradient(180deg, #eef6ff 0%, #e3edff 45%, #f0f7ff 100%)" }}>
        {(messages[currentBuddy.id]||[]).map(m=>(
          <div key={m.id} className={`flex ${m.role==="me"?"justify-end":"justify-start"}`}>
            {m.role==="bot" && (
              <div className="mr-2 w-7 h-7 grid place-items-center rounded-full text-base bg-[#eef2ff] border border-black/10">{currentBuddy.avatar}</div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-[14px] ${m.role==="me"?"bg-[rgba(182,198,231,.36)]":"bg-[rgba(160,202,199,.20)]"} border border-black/10`}>
              {m.text}
            </div>
            {m.role==="me" && (
              <div className="ml-2 w-7 h-7 grid place-items-center rounded-full text-base bg-[#eef2ff] border border-black/10">{myAvatar}</div>
            )}
          </div>
        ))}
      </div>

      <div className="h-[60px] px-2 flex items-center gap-2 bg-white/85 border-t border-black/10">
        <button onClick={()=>setPlusOpen(true)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="More"><Plus className="w-5 h-5"/></button>
        <button className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5" title="Album (placeholder)"><Img className="w-5 h-5"/></button>
        <div className="flex-1">
          <input value={draft} onChange={(e)=>setDraft(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()}
            placeholder="Say something…" className="w-full h-10 px-3 bg-[#f3f5fb] border border-black/10 rounded" />
        </div>
        <button onClick={send} className="w-9 h-9 grid place-items-center rounded-full bg-[#4253ff] text-white"><Send className="w-4 h-4"/></button>
      </div>

      {plusOpen && currentBuddy && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-black/25" onClick={()=>setPlusOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 p-3">
            <div className="mx-auto max-w-sm rounded-2xl overflow-hidden bg-white border border-black/10 shadow-xl">
              <div className="px-4 py-3 border-b border-black/10 text-sm font-medium">{currentBuddy.name} · Tools</div>
              <div className="p-3 grid gap-3 text-sm">
                <div className="rounded-xl p-3 bg-black/[.04] border border-black/10">
                  <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Memories</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(memories[currentBuddy.id]||[]).length===0 && <div className="text-[12px] opacity-60">No memories yet.</div>}
                    {(memories[currentBuddy.id]||[]).map(m=>(
                      <div key={m.id} className="flex items-start gap-2 rounded-lg p-2 bg-white border border-black/10">
                        <div className="text-[12px] opacity-50 min-w-[70px]">
                          {new Date(m.ts).toLocaleString([], { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })}
                        </div>
                        <div className="flex-1 text-[13px]">{m.text}</div>
                        <button className="p-1 rounded hover:bg-black/5" onClick={()=>setMemories(p=>({...p,[currentBuddy.id]:(p[currentBuddy.id]||[]).filter(x=>x.id!==m.id)}))}><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input value={newMemory} onChange={(e)=>setNewMemory(e.target.value)} placeholder="Add a memory…" className="flex-1 h-9 px-3 bg-white border border-black/10 rounded text-[13px]" />
                    <button onClick={()=>{ if(!currentBuddy) return; const t=newMemory.trim(); if(!t) return; const item={id:Date.now(), text:t, ts:Date.now()}; setMemories(p=>({...p,[currentBuddy.id]:[...(p[currentBuddy.id]||[]), item]})); setNewMemory(""); }} className="px-3 h-9 rounded bg-[#4253ff] text-white">Save</button>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 flex justify-end border-t border-black/10">
                <button onClick={()=>setPlusOpen(false)} className="px-3 py-1.5 text-[13px] rounded bg-black/5 border border-black/10">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SettingsScreen = (
    <div className="relative w-full h-full bg-white/60">
      <div className="relative h-11 flex items-center justify-center bg-white/85 border-b border-black/10">
        <div className="text-[13px] font-medium tracking-wide">Settings</div>
        <button onClick={()=>setScreen("home")} className="absolute left-2 top-1.5 p-1.5 rounded hover:bg-black/5"><ChevronLeft className="w-4 h-4"/></button>
        <button onClick={onClose} className="absolute right-2 top-1.5 p-1.5 rounded hover:bg-black/5"><X className="w-4 h-4"/></button>
      </div>
      <div className="h-[calc(100%-44px)] overflow-y-auto">
        <div className="p-3">
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-white border border-black/10 shadow">
            <div className="w-12 h-12 grid place-items-center rounded-full text-2xl bg-[#eef2ff] border border-black/10">{myAvatar}</div>
            <div className="flex-1">
              <div className="text-[12px] opacity-60">Nickname</div>
              <input value={myName} onChange={(e)=>setMyName(e.target.value)} className="w-full px-2 py-1 text-[14px] bg-white border border-black/10 rounded" />
            </div>
            <button onClick={()=>setMyAvatar(prompt("Enter an emoji:", myAvatar || "🙂") || myAvatar)} className="px-3 py-2 rounded bg-black/5 border border-black/10">Change</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------- 渲染 ----------
  return (
    <PhoneShell
      open={open}
      onClose={onClose}
      statusText={`${now.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", hour12:false})} · Vlinks LTE · 84%`}
      island={Island}
      defaultFullscreen={false}
    >
      {screen==="lock"     && LockScreen}
      {screen==="home"     && HomeScreen}
      {screen==="vchat"    && vchatScreen}
      {screen==="chat"     && ChatScreen}
      {screen==="settings" && SettingsScreen}
      {screen==="game"     && <div style={{height:"100%", overflow:"auto"}}><Game onBack={()=>setScreen("home")} /></div>}
      {screen==="tarot"    && (
        <TarotScreen
          onBack={()=>setScreen("home")}
          onOpenSafety={()=>setScreen("home")}
          forceSafety={false}
          handoffText={""}
        />
      )}
    </PhoneShell>
  );
}
