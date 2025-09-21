// src/Game.tsx
import React, { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Environment } from "@react-three/drei";
import { createPortal } from "react-dom";
import { Coins, Star, Leaf, X, MessageCircle, Store, ShoppingBag, Heart } from "lucide-react";
import * as THREE from "three";

/* =========================
   Types & Data
========================= */
type Stat = { hunger: number; affinity: number; energy: number };
type ShopItem = {
  id: string;
  title: string;
  icon: string;
  price: number;
  type: "food" | "daily";
};
type Owned = Record<string, number>;

const SHOP: ShopItem[] = [
  { id: "strawberry-milk", title: "Strawberry Milk", icon: "🥤", price: 8, type: "food" },
  { id: "energy-cookie", title: "Energy Cookie", icon: "🍪", price: 12, type: "food" },
  { id: "scented-candle", title: "Scented Candle", icon: "🕯️", price: 30, type: "daily" },
  { id: "cushion", title: "Cushion", icon: "🛋️", price: 25, type: "daily" },
];

/* =========================
   Modal Sheet
========================= */
function Sheet({
  title,
  open,
  onClose,
  children,
}: React.PropsWithChildren<{ title: string; open: boolean; onClose: () => void }>) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[900]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto">
        <div className="mx-3 sm:mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0B1220]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-medium">{title}</div>
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-sm"
            >
              Close
            </button>
          </div>
          <div className="p-3">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================
   3D: Jellyfish 模型（带漂浮动画）
========================= */
function JellyfishModel() {
  // 把你的水母模型放到 public/models/jellyfish.glb
  const { scene } = useGLTF("/models/jellyfish.glb");
  const ref = useRef<THREE.Object3D>(null!);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.15 + Math.sin(t * 1.2) * 0.12;
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.35;
  });
  return <primitive ref={ref} object={scene} scale={0.28} position={[0, 0.0, 0]} />;
}
useGLTF.preload("/models/jellyfish.glb");

/* =========================
   3D: Room 模型（优先使用 room.glb；没有就用程序化房间兜底）
========================= */
function RoomModel() {
  // 把你的房间模型放到 public/models/room.glb
  const { scene } = useGLTF("/models/room.glb");
  // 你可以在这里微调整体缩放/位置以适配小屏
  return <primitive object={scene} scale={0.9} position={[0, -1.0, 0]} />;
}

function FallbackRoom() {
  // 内贴面“盒子”+ 地面 + 顶部水纹，保证没有 glb 也能跑
  return (
    <group>
      <mesh scale={[6, 3.2, 6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color="#03131f" metalness={0.05} roughness={0.85} side={THREE.BackSide} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow>
        <planeGeometry args={[6, 6, 1, 1]} />
        <meshStandardMaterial color="#061b27" roughness={0.9} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.55, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#0e2c40" transparent opacity={0.25} />
      </mesh>

      {/* 简易家具占位（可删） */}
      <mesh position={[-1.8, -1.3, -1.4]}>
        <boxGeometry args={[1.1, 0.5, 1.8]} />
        <meshStandardMaterial color="#365b7a" roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[1.9, -1.3, 1.2]}>
        <cylinderGeometry args={[0.3, 0.38, 0.5, 10]} />
        <meshStandardMaterial color="#a65a7a" />
      </mesh>
    </group>
  );
}

/* 有/无 room.glb 的选择器 */
function SmartRoom() {
  const [ok] = useState(true); // 占位（drei 会在加载失败时抛错，交给 Suspense fallback）
  return (
    <Suspense fallback={<FallbackRoom />}>
      {ok && <RoomModel />}
    </Suspense>
  );
}

/* =========================
   3D: 场景光照 & 控制
========================= */
function OceanLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight position={[0, 2.8, 1.8]} angle={0.6} penumbra={0.6} intensity={1.5} color={"#9fd7ff"} castShadow />
      <pointLight position={[0, -0.8, -1.2]} intensity={0.6} color={"#1aa3ff"} />
      <Environment preset="night" />
    </>
  );
}

/* =========================
   3D: 可点的信息牌（四角入口）
========================= */
function InfoBoard({
  label,
  onClick,
  pos,
  icon,
}: {
  label: string;
  onClick: () => void;
  pos: [number, number, number];
  icon?: React.ReactNode;
}) {
  return (
    <group position={pos}>
      <mesh onClick={onClick} onPointerDown={(e) => e.stopPropagation()}>
        <planeGeometry args={[1.25, 0.64]} />
        <meshStandardMaterial color="#184e6a" roughness={0.8} metalness={0.1} />
      </mesh>
      <Html center transform distanceFactor={1.3}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="px-3 py-1 rounded-xl bg-black/55 border border-white/20 text-white text-xs shadow hover:bg-black/65"
        >
          <span className="inline-flex items-center gap-2">
            {icon} {label}
          </span>
        </button>
      </Html>
    </group>
  );
}

/* =========================
   顶部 HUD + 灵动岛 + 退出按钮（Overlay）
========================= */
function TopOverlay({
  coins, stars, leaves,
  liveText,
  onToggleIsland,
  onExit,
}: {
  coins: number; stars: number; leaves: number;
  liveText: string;
  onToggleIsland: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute top-2 left-2 right-2 z-[100] text-white select-none pointer-events-none">
      {/* 灵动岛 */}
      <div className="flex items-center justify-center">
        <button
          onClick={onToggleIsland}
          className="pointer-events-auto w-[140px] h-[34px] rounded-[22px]"
          style={{
            background: "rgba(0,0,0,.88)",
            boxShadow: "0 10px 28px rgba(0,0,0,.45), 0 0 0 0.5px rgba(255,255,255,.06) inset",
          }}
          aria-label="Live Island"
          title="Live Island"
        />
      </div>

      {/* 右上角退出 */}
      <div className="absolute right-0 top-0">
        <button
          onClick={onExit}
          className="pointer-events-auto h-9 w-9 grid place-items-center rounded-full bg-white/85 hover:bg-white text-black"
          title="Exit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 货币 HUD */}
      <div className="mt-2 flex items-center justify-center gap-2 pointer-events-auto">
        <span className="px-2 py-1 bg-black/40 rounded-full inline-flex items-center gap-1 text-sm">
          <Coins className="w-4 h-4" /> {coins}
        </span>
        <span className="px-2 py-1 bg-black/40 rounded-full inline-flex items-center gap-1 text-sm">
          <Star className="w-4 h-4" /> {stars}
        </span>
        <span className="px-2 py-1 bg-black/40 rounded-full inline-flex items-center gap-1 text-sm">
          <Leaf className="w-4 h-4" /> {leaves}
        </span>
      </div>

      {/* 灵动岛展开卡片 */}
      {liveText && (
        <div className="mx-auto mt-2 w-[280px] rounded-2xl px-3 py-2"
             style={{
               background: "rgba(20,24,34,.62)",
               border: "1px solid rgba(255,255,255,.18)",
               backdropFilter: "blur(18px) saturate(140%)",
               boxShadow: "0 18px 48px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.35)",
             }}>
          <div className="text-sm">{liveText}</div>
        </div>
      )}
    </div>
  );
}

/* =========================
   主容器
========================= */
export default function Game({
  onExit,
}: {
  onExit: () => void; // ChatPhone 里传 onBack 或 setScreen("home")
}) {
  // 资源
  const [coins, setCoins] = useState(120);
  const [stars, setStars] = useState(40);
  const [leaves, setLeaves] = useState(80);

  // 状态 & 包 & 动态
  const [stats, setStats] = useState<Stat>({ hunger: 62, affinity: 48, energy: 82 });
  const [bag, setBag] = useState<Owned>({ "strawberry-milk": 2, "energy-cookie": 1 });
  const [social, setSocial] = useState<string[]>([
    "09:20 | Jellyfish swam happily.",
    "12:05 | Jellyfish looked curious.",
  ]);

  // Sheet 开关
  const [openStatus, setOpenStatus] = useState(false);
  const [openShop, setOpenShop] = useState(false);
  const [openBag, setOpenBag] = useState(false);
  const [openSocial, setOpenSocial] = useState(false);

  // 灵动岛
  const [islandOpen, setIslandOpen] = useState(false);
  const liveText = islandOpen ? "Louise is floating softly 🪼" : "";

  // 行为
  function buy(item: ShopItem) {
    if (coins < item.price) { alert("Not enough coins."); return; }
    setCoins((c) => c - item.price);
    setBag((o) => ({ ...o, [item.id]: (o[item.id] || 0) + 1 }));
    setStars((s) => s + 1);
    setSocial((logs) => [`Now • Bought ${item.title} ${item.icon}`, ...logs]);
  }
  function useItem(id: string) {
    if (!bag[id]) return;
    const item = SHOP.find((s) => s.id === id); if (!item) return;
    setBag((o) => ({ ...o, [id]: Math.max(0, (o[id] || 0) - 1) }));
    setStats((s) => ({
      hunger: Math.min(100, s.hunger + (item.type === "food" ? 12 : 0)),
      affinity: Math.min(100, s.affinity + 6),
      energy: Math.min(100, s.energy + (item.type === "food" ? 4 : 8)),
    }));
    setSocial((logs) => [`Now • Used ${item.title} ${item.icon}`, ...logs]);
  }

  return (
    <div className="relative w-full h-full bg-[#020914] text-white">
      {/* 3D 场景 */}
      <Canvas
        camera={{ position: [0, 1.0, 3.2], fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <OceanLighting />
        <Suspense fallback={<FallbackRoom />}>
          <SmartRoom />
        </Suspense>

        {/* Jellyfish 放房间中央（已缩小） */}
        <Suspense fallback={null}>
          <JellyfishModel />
        </Suspense>

        {/* 四个角落入口：Status / Shop / Bag / Social */}
        <InfoBoard label="Status" pos={[-2.1, -0.8, -2.1]} onClick={() => setOpenStatus(true)} icon={<Heart className="w-4 h-4" />} />
        <InfoBoard label="Shop"   pos={[ 2.1, -0.8, -2.1]} onClick={() => setOpenShop(true)}   icon={<Store className="w-4 h-4" />} />
        <InfoBoard label="Bag"    pos={[-2.1, -0.8,  2.1]} onClick={() => setOpenBag(true)}    icon={<ShoppingBag className="w-4 h-4" />} />
        <InfoBoard label="Social" pos={[ 2.1, -0.8,  2.1]} onClick={() => setOpenSocial(true)} icon={<MessageCircle className="w-4 h-4" />} />

        {/* 相机控制：禁止缩放/平移，只允许小幅旋转，手机体验更像“房间” */}
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.9} maxPolarAngle={1.4} />
      </Canvas>

      {/* 顶层 Overlay：灵动岛 + HUD + 退出 */}
      <TopOverlay
        coins={coins}
        stars={stars}
        leaves={leaves}
        liveText={liveText}
        onToggleIsland={() => setIslandOpen(v => !v)}
        onExit={onExit}
      />

      {/* ====== Sheets ====== */}
      <Sheet title="Status" open={openStatus} onClose={() => setOpenStatus(false)}>
        <div className="space-y-2 text-sm">
          <div>Hunger <span className="opacity-70">{stats.hunger} / 100</span></div>
          <div>Affinity <span className="opacity-70">{stats.affinity} / 100</span></div>
          <div>Energy <span className="opacity-70">{stats.energy} / 100</span></div>
          <button
            onClick={() => { setCoins((c)=>c+5); setLeaves((l)=>l+2); }}
            className="mt-2 px-3 h-9 rounded-lg bg-white text-black text-sm"
          >
            Complete Tiny Task +5🪙
          </button>
        </div>
      </Sheet>

      <Sheet title="Shop" open={openShop} onClose={() => setOpenShop(false)}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {SHOP.map((it) => (
            <div key={it.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-2xl">{it.icon}</div>
              <div className="mt-1 font-medium">{it.title}</div>
              <div className="text-xs opacity-75">Price: {it.price}</div>
              <button
                onClick={() => buy(it)}
                className="mt-2 px-2 py-1 rounded-md bg-white text-black text-xs"
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet title="Bag" open={openBag} onClose={() => setOpenBag(false)}>
        {Object.entries(bag).length === 0 ? (
          <div className="text-white/70 text-sm">Bag is empty.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(bag).map(([id, n]) => {
              const item = SHOP.find((s) => s.id === id)!;
              return (
                <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-2xl">{item.icon}</div>
                  <div className="mt-1 text-sm font-medium">{item.title}</div>
                  <div className="text-[12px] text-white/80">Owned: {n}</div>
                  <button
                    onClick={() => useItem(id)}
                    className="mt-2 w-full px-2 py-1 rounded-lg bg-white/90 text-black text-xs"
                  >
                    Use
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Sheet>

      <Sheet title="Social" open={openSocial} onClose={() => setOpenSocial(false)}>
        <div className="space-y-2 text-sm">
          {social.map((line, i) => (
            <div key={i} className="px-3 py-2 rounded-lg border border-white/10 bg-white/5">
              {line}
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
