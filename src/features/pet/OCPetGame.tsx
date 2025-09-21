// src/features/pet/OCPetGame.tsx
import React, { useRef, useState } from "react";
import { ChevronLeft, Coins, Star, Leaf, Store, ShoppingBag, MessageCircle, Camera, Heart, Plus } from "lucide-react";
import { BUDDIES, SHOP } from "./data";
import PortalDropdown from "./PortalDropdown";
import Sheet from "./Sheet";
import { Card, Pill, StatBar } from "./ui";
import { usePetGame } from "./usePetGame";

export default function OCPetGame({ onBack }: { onBack: () => void }) {
  const {
    coins, stars, leaves,
    buddyId, setBuddyId, buddy, ddRef,
    stats, social, buy, useItem, completeTask, bag,
    setStats, setSocial,
  } = usePetGame();

  const [interactOpen, setInteractOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  /* === 把你原来 Game 里的 JSX 几乎原封不动贴回来 === */
  // —— Hero / StatsPanel / SocialPanel / ShopPanel / BagPanel / FooterBar —— //
  // （这里与原代码一致，只是把数据/函数改为来自 hook）

  // …为了省篇幅，下面直接使用你原先的布局：
  return (
    <div className="relative min-h-screen text-white bg-gradient-to-b from-[#050b17] via-[#081226] to-[#02060c] pb-24">
      <div className="mx-auto max-w-xl px-3 pt-3">
        <div className="grid gap-3">
          {/* ===== Hero ===== */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2 text-[12px]">
                <span className="px-2 py-1 bg-black/30 rounded-full inline-flex items-center gap-1"><Coins className="w-4 h-4" />{coins}</span>
                <span className="px-2 py-1 bg-black/30 rounded-full inline-flex items-center gap-1"><Star  className="w-4 h-4" />{stars}</span>
                <span className="px-2 py-1 bg-black/30 rounded-full inline-flex items-center gap-1"><Leaf  className="w-4 h-4" />{leaves}</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] opacity-70">VLinks</div>
                <div className="font-extrabold tracking-[0.18em]">BUDDY LIFE</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 grid place-items-center text-3xl border border-white/20 overflow-hidden">
                <span>{buddy.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-semibold leading-none truncate">{buddy.name}</div>
                <div className="flex gap-1 mt-2 flex-wrap">{buddy.tags.map(t => <Pill key={t}>{t}</Pill>)}</div>
              </div>

              <PortalDropdown
                value={buddyId}
                onChange={(v)=>setBuddyId(v as any)}
                options={BUDDIES.map(b=>b.id)}
                anchorRef={ddRef as any}
                render={(id)=>{
                  const b = BUDDIES.find(x=>x.id===id)!;
                  return <span className="inline-flex items-center gap-2"><span className="text-base">{b.emoji}</span><span className="text-sm">{b.name}</span></span>;
                }}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button onClick={completeTask} className="px-3 h-9 rounded-xl bg-white text-black text-sm inline-flex items-center gap-2 shadow active:scale-95">
                <Plus className="w-4 h-4" /> Task +10
              </button>
              <button onClick={()=>setInteractOpen(true)} className="px-3 h-9 rounded-xl bg-white/10 border border-white/20 text-sm inline-flex items-center gap-2 hover:bg-white/15 active:scale-95">
                Interact
              </button>
              <button onClick={onBack} className="px-3 h-9 rounded-xl bg-white/10 border border-white/20 text-sm inline-flex items-center gap-2 hover:bg-white/15 active:scale-95">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          </Card>

          {/* ===== Stats ===== */}
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Mind & Stats</div>
            <div className="grid gap-3">
              <StatBar label="Satiety" value={stats[buddyId].hunger} />
              <StatBar label="Affinity" value={stats[buddyId].affinity} />
              <StatBar label="Energy" value={stats[buddyId].energy} />
            </div>
          </Card>

          {/* ===== Social ===== */}
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Social</div>
            <div className="space-y-2 text-[13px]">
              {social.map((line, i)=>(
                <div key={i} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5">{line}</div>
              ))}
              {social.length===0 && <div className="text-white/60">No social updates yet.</div>}
            </div>
          </Card>

          {/* ===== Shop ===== */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2"><Store className="w-4 h-4" /> Shop</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SHOP.map(it=>(
                <div key={it.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-2xl">{it.icon}</div>
                  <div className="mt-2 text-sm font-medium">{it.title}</div>
                  <div className="mt-1 text-[12px] text-white/70 capitalize">{it.type}</div>
                  <div className="mt-2 flex items-center justify-between text-[12px]">
                    <span className="inline-flex items-center gap-1"><Coins className="w-4 h-4" />{it.price}</span>
                    <button onClick={()=>buy(it.id)} className="px-2 py-1 rounded-lg bg-white text-black text-xs active:scale-95">Buy</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ===== Bag ===== */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Bag</div>
            </div>
            {Object.entries(bag).filter(([,n])=>n>0).length===0 ? (
              <div className="text-white/60 text-sm">Your bag is empty.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(bag).filter(([,n])=>n>0).map(([id, n])=>{
                  const item = SHOP.find(s=>s.id===id)!;
                  return (
                    <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-2xl">{item.icon}</div>
                      <div className="mt-2 text-sm font-medium">{item.title}</div>
                      <div className="mt-1 text-[12px] text-white/70">Owned: {n}</div>
                      <button onClick={()=>useItem(id)} className="mt-2 w-full px-2 py-1 rounded-lg bg-white/90 text-black text-xs active:scale-95">Use</button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* FooterBar（与原来一致，可选） */}
      <div className="fixed bottom-2 left-0 right-0 z-[80]">
        <div className="mx-auto max-w-md">
          <div className="mx-3 rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-lg">
            <div className="h-14 grid grid-cols-3 place-items-center text-white/80">
              <button className="hover:text-white transition inline-flex items-center gap-2 text-sm" onClick={()=>setInteractOpen(true)}><span className="text-lg">🍪</span> Feed</button>
              <button className="hover:text-white transition inline-flex items-center gap-2 text-sm" onClick={()=>setInteractOpen(true)}><MessageCircle className="w-5 h-5" /> Interact</button>
              <button className="hover:text-white transition inline-flex items-center gap-2 text-sm" onClick={()=>setPhotoOpen(true)}><Camera className="w-5 h-5" /> Photo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Interact */}
      <Sheet title={`Interact with ${buddy.name}`} open={interactOpen} onClose={()=>setInteractOpen(false)}>
        <div className="text-[13px] text-white/80 mb-2">Tiny interactions raise affinity and consume a little energy.</div>
        <div className="grid grid-cols-3 gap-2">
          <button className="h-10 rounded-xl bg-white/10 border border-white/15 text-sm"
            onClick={()=>{
              setStats(p=>({ ...p, [buddyId]: { ...p[buddyId], affinity: Math.min(100, p[buddyId].affinity+3), energy: Math.max(0, p[buddyId].energy-2) }}));
              setSocial(logs=>[`Now • You chatted with ${buddy.name} 🗨️`, ...logs]);
            }}>Chat 💬</button>
          <button className="h-10 rounded-xl bg-white/10 border border-white/15 text-sm"
            onClick={()=>{
              setStats(p=>({ ...p, [buddyId]: { ...p[buddyId], affinity: Math.min(100, p[buddyId].affinity+4), energy: Math.max(0, p[buddyId].energy-1) }}));
              setSocial(logs=>[`Now • You petted ${buddy.name} 🫶`, ...logs]);
            }}>Pet 🫶</button>
          <button className="h-10 rounded-xl bg-white/10 border border-white/15 text-sm"
            onClick={()=>{
              setStats(p=>({ ...p, [buddyId]: { ...p[buddyId], affinity: Math.min(100, p[buddyId].affinity+2), energy: Math.max(0, p[buddyId].energy-3) }}));
              setSocial(logs=>[`Now • You walked with ${buddy.name} 🚶`, ...logs]);
            }}>Walk 🚶</button>
        </div>
      </Sheet>

      {/* Photo */}
      <Sheet title="Photo" open={photoOpen} onClose={()=>setPhotoOpen(false)}>
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2,3,4,5].map(i=>(
            <div key={i} className="aspect-square rounded-xl border border-white/10 bg-white/5 grid place-items-center text-2xl">
              <Heart className="w-5 h-5" />
            </div>
          ))}
        </div>
        <div className="mt-3 text-right">
          <button className="px-3 h-9 rounded-xl bg-white text-black text-sm inline-flex items-center gap-2 active:scale-95">Save</button>
        </div>
      </Sheet>
    </div>
  );
}
