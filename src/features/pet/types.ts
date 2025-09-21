// src/features/pet/types.ts
export type BuddyId = "skylar" | "louise" | "luther" | "joshua";

export type Buddy = {
  id: BuddyId;
  name: string;
  emoji: string;      // 先用 emoji，之后可以换 sprite
  tags: string[];
};

export type Stat = { hunger: number; affinity: number; energy: number };

export type ShopItem = {
  id: string;
  title: string;
  icon: string;
  price: number;
  type: "food" | "tool" | "daily";
};

export type Owned = Record<string, number>;
