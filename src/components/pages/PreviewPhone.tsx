// pages/PreviewPhone.tsx
import React from "react";
import PhoneFrame from "../components/PhoneFrame";
import HomeScreen from "../screens/HomeScreen";
import TarotMini from "../components/TarotMini";  // 你之前的玻璃风 TarotMini（挂 #overlay-root）

export default function PreviewPhone() {
  const [openTarot, setOpenTarot] = React.useState(false);

  return (
    <div className="py-6">
      <PhoneFrame
        wallpaperClassName="
          bg-[radial-gradient(1200px_800px_at_-10%_-10%,#c7e5ff,transparent),
              radial-gradient(1000px_600px_at_120%_10%,#ffd3f2,transparent),
              linear-gradient(180deg,#ecf3ff,white)]
        "
        notch="island"
      >
        <HomeScreen />

        {/* 浮动的小圆点（AssistiveTouch 风） */}
        <button
          onClick={()=>setOpenTarot(true)}
          className="
            absolute right-3 bottom-28 z-30
            w-10 h-10 rounded-full
            bg-white/40 backdrop-blur-xl
            border border-white/50 ring-1 ring-white/30
            shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.6)]
            active:scale-95 transition
            text-[18px]
          "
          title="Open Tarot"
        >
          🔮
        </button>
      </PhoneFrame>

      {/* 玻璃风 TarotMini（之前那版），Portal 到 #overlay-root */}
      <TarotMini open={openTarot} onClose={()=>setOpenTarot(false)} onOpenSafety={()=>alert("Safety")} />
    </div>
  );
}
