// src/features/pet/data.ts
import type { Buddy, ShopItem } from "./types";

export const BUDDIES: Buddy[] = [
  { id: "skylar", name: "Skylar", emoji: "🐙", tags: ["Gentle", "Creative", "Buddy"] },
  { id: "louise", name: "Louise", emoji: "🪼", tags: ["Wisdom", "Soft", "Buddy"] }, // ← 水母
  { id: "luther", name: "Luther", emoji: "🐋", tags: ["Observant", "Supportive", "Buddy"] },
  { id: "joshua", name: "Joshua", emoji: "🐢", tags: ["Cool", "Funny", "Buddy"] },
];

export const SHOP: ShopItem[] = [
  { id: "strawberry-milk", title: "Strawberry Milk", icon: "🥤", price: 8, type: "food" },
  { id: "energy-cookie",   title: "Energy Cookie",   icon: "🍪", price: 12, type: "food" },
  { id: "scented-candle",  title: "Scented Candle",  icon: "🕯️", price: 30, type: "daily" },
  { id: "cushion",         title: "Cushion",         icon: "🛋️", price: 25, type: "daily" },
  { id: "desk-lamp",       title: "Desk Lamp",       icon: "💡", price: 60, type: "daily" },
  { id: "cat-grass",       title: "Cat Grass",       icon: "🌿", price: 6,  type: "daily" },
];
