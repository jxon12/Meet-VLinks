// src/features/pet/usePetGame.ts
import { useMemo, useRef, useState } from "react";
import type { BuddyId, Owned, Stat } from "./types";
import { BUDDIES, SHOP } from "./data";

export function usePetGame() {
  const [coins, setCoins] = useState(120);
  const [stars, setStars] = useState(50);
  const [leaves, setLeaves] = useState(80);

  const [buddyId, setBuddyId] = useState<BuddyId>("skylar");
  const buddy = useMemo(() => BUDDIES.find(b => b.id === buddyId)!, [buddyId]);
  const ddRef = useRef<HTMLButtonElement>(null);

  const [stats, setStats] = useState<Record<BuddyId, Stat>>({
    skylar: { hunger: 62, affinity: 48, energy: 82 },
    louise: { hunger: 40, affinity: 66, energy: 74 },
    luther: { hunger: 51, affinity: 58, energy: 60 },
    joshua: { hunger: 70, affinity: 35, energy: 90 },
  });

  const [bag, setBag] = useState<Owned>({
    "strawberry-milk": 2,
    "energy-cookie": 1,
    "scented-candle": 1,
  });

  const [social, setSocial] = useState<string[]>([
    '09:20 | Skylar liked your note "Mini Pomodoro works!"',
    "12:05 | Skylar chatted with Louise about today's class.",
    "18:42 | Skylar joined a study group.",
  ]);

  function buy(itemId: string) {
    const item = SHOP.find(s => s.id === itemId)!;
    if (coins < item.price) return;
    setCoins(c => c - item.price);
    setBag(o => ({ ...o, [item.id]: (o[item.id] || 0) + 1 }));
    setStars(s => s + 1);
  }
  function useItem(itemId: string) {
    if (!bag[itemId]) return;
    const item = SHOP.find(s => s.id === itemId)!;
    setBag(o => ({ ...o, [itemId]: Math.max(0, (o[itemId] || 0) - 1) }));
    setStats(prev => {
      const curr = { ...prev[buddyId] };
      if (item.type === "food") {
        curr.hunger = Math.min(100, curr.hunger + 12);
        curr.affinity = Math.min(100, curr.affinity + 6);
      } else {
        curr.energy = Math.min(100, curr.energy + 8);
      }
      return { ...prev, [buddyId]: curr };
    });
    setSocial(logs => [`Now • ${buddy.name} used ${item.title} ${item.icon}`, ...logs]);
  }
  function completeTask() {
    setCoins(c => c + 10);
    setLeaves(l => l + 2);
    setSocial(logs => [`Now • ${buddy.name} completed a task +10🪙`, ...logs]);
  }

  return {
    coins, stars, leaves,
    buddyId, setBuddyId, buddy, ddRef,
    stats, setStats,
    bag, setBag,
    social, setSocial,
    buy, useItem, completeTask,
  };
}
