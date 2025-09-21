// screens/HomeScreen.tsx
import React from "react";
import { AppIcon } from "../components/AppIcon";

export default function HomeScreen() {
  return (
    <div className="h-full w-full">
      {/* 上半：应用网格 */}
      <div className="grid grid-cols-4 gap-y-5 gap-x-3">
        <AppIcon title="Vchat" emoji="💬"/>
        <AppIcon title="Divination" emoji="🔮"/>
        <AppIcon title="Game" emoji="🎮"/>
        <AppIcon title="Weather" emoji="🌤️"/>
        <AppIcon title="Settings" emoji="⚙️"/>
        {/* 你可以继续加 */}
      </div>

      {/* Dock 图标（覆盖在 PhoneFrame 的玻璃 Dock 上） */}
      <div className="absolute bottom-[58px] left-1/2 -translate-x-1/2 w-[78%]">
        <div className="flex justify-around">
          <AppIcon title="Phone" emoji="📞"/>
          <AppIcon title="Safari" emoji="🧭"/>
          <AppIcon title="Music" emoji="🎵"/>
          <AppIcon title="Messages" emoji="✉️"/>
        </div>
      </div>
    </div>
  );
}
