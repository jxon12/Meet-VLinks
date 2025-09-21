import React from "react";

type RoomProps = {
  buddy: { id: string; name: string; sprite: string };
  furniture?: { id: string; icon: string; x: number; y: number }[];
};

export default function Room({ buddy, furniture = [] }: RoomProps) {
  return (
    <div
      className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
      style={{
        aspectRatio: "1 / 1", // 正方形房间
        backgroundSize: "40px 40px",
        backgroundImage:
          "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
      }}
    >
      {/* 家具 */}
      {furniture.map((f) => (
        <div
          key={f.id}
          className="absolute text-3xl"
          style={{ left: f.x, top: f.y }}
        >
          {f.icon}
        </div>
      ))}

      {/* 宠物 */}
      <div
        className="absolute text-5xl"
        style={{ left: "40%", top: "50%" }}
        title={buddy.name}
      >
        {buddy.sprite}
      </div>
    </div>
  );
}