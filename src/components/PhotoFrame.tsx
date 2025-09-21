// components/PhoneFrame.tsx
import React from "react";

type PhoneFrameProps = React.PropsWithChildren<{
  wallpaperClassName?: string;   // 背景壁纸（支持渐变/图）
  notch?: "island" | "notch" | "none"; // 顶部样式
}>;

export default function PhoneFrame({
  children,
  wallpaperClassName = "bg-gradient-to-br from-[#e8f2ff] via-white to-[#eef2ff]",
  notch = "island",
}: PhoneFrameProps) {
  return (
    <div className="relative mx-auto w-[360px] sm:w-[390px]">
      {/* 外壳（深色机身+玻璃反光） */}
      <div className="
        relative rounded-[46px] p-2
        bg-neutral-900
        shadow-[0_20px_60px_rgba(0,0,0,0.35)]
      ">
        {/* 冷凝高光 */}
        <div className="pointer-events-none absolute inset-0 rounded-[46px] ring-1 ring-white/10" />

        {/* 屏幕主体 */}
        <div className="
          relative overflow-hidden rounded-[38px]
          bg-black
          w-[calc(360px-16px)] sm:w-[calc(390px-16px)]
          h-[780px]
        ">
          {/* 壁纸（可自定义） */}
          <div className={`absolute inset-0 ${wallpaperClassName}`} />

          {/* 壁纸轻噪点/朦胧 */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] mix-blend-overlay" />

          {/* 顶部：动态岛 or 刘海 */}
          {notch !== "none" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              {notch === "island" ? (
                <div className="w-36 h-8 rounded-[18px] bg-black/80 shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
              ) : (
                <div className="w-48 h-22 rounded-[22px] bg-black" />
              )}
            </div>
          )}

          {/* 状态栏 */}
          <StatusBar />

          {/* 内容安全区容器（供你放图标/桌面/应用） */}
          <div className="absolute inset-0 pt-16 pb-12 px-4">
            {children}
          </div>

          {/* Dock（玻璃条） */}
          <div className="
            absolute bottom-[46px] left-1/2 -translate-x-1/2
            w-[84%] h-[68px] rounded-[24px]
            bg-white/18 backdrop-blur-2xl
            border border-white/30 ring-1 ring-white/30
            shadow-[0_10px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.5)]
          " />

          {/* Home 指示条 */}
          <div className="
            absolute bottom-2 left-1/2 -translate-x-1/2
            w-28 h-[5px] rounded-full
            bg-white/80
          " />
        </div>
      </div>
    </div>
  );
}

/* ======= 子组件：状态栏（时间/信号/Wi-Fi/电池） ======= */
function StatusBar() {
  return (
    <div className="
      absolute top-3 z-10 w-full px-5
      text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
      flex items-center justify-between
    ">
      <div className="text-[13px] font-semibold tracking-tight">9:41</div>
      <div className="flex items-center gap-2">
        {/* 信号 */}
        <div className="flex gap-[2px]">
          {[1,2,3,4].map((i)=>(
            <div key={i} className="w-[3px] h-[9px] bg-white/90 rounded-[1px]" />
          ))}
        </div>
        {/* Wi-Fi */}
        <svg viewBox="0 0 20 20" className="w-4 h-4 fill-white/90">
          <path d="M10 15a2 2 0 1 0 0.001 0zM2 7c4.418-4 11.582-4 16 0l-1.6 1.2c-3.536-3.2-9.264-3.2-12.8 0L2 7zm3 3c2.9-2.6 9.1-2.6 12 0l-1.5 1.2c-2.2-2-6.8-2-9 0L5 10z" />
        </svg>
        {/* 电池 */}
        <div className="flex items-center">
          <div className="w-[22px] h-[11px] rounded-[3px] border border-white/80 relative">
            <div className="absolute inset-[1px] rounded-[2px] bg-white/90" />
          </div>
          <div className="w-[2px] h-[6px] ml-[2px] bg-white/80 rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}
