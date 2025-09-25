// src/components/ComposeSheet.tsx
import React, { useRef, useEffect, useState } from "react";
import { Image as ImageIcon, Camera, Type } from "lucide-react";
import { createPortal } from "react-dom";

export type ComposeResult =
  | { kind: "image"; files: File[] }
  | { kind: "camera" }
  | { kind: "text" }
  | { kind: "cancel" };

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (r: ComposeResult) => void;
};

export default function ComposeSheet({ open, onClose, onResult }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 动画状态
  const [mounted, setMounted] = useState(open);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // 打开/关闭时控制挂载 & 禁止背景滚动
  useEffect(() => {
    if (open) {
      setMounted(true);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      // 播放退出动画后卸载
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!mounted) return null;

  // 手势：下拉关闭（移动端）
  const startY = useRef(0);
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    setDragging(true);
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragging) return;
    const dy = Math.max(0, e.clientY - startY.current);
    setDragY(dy);
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    setDragging(false);
    // 阈值：拖动超过 120px 就关闭
    if (dragY > 120) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const panelStyle: React.CSSProperties = {
    transform: `translateY(${open ? dragY : 24}px)`,
    opacity: open ? 1 : 0,
    transition: dragging ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease",
  };

  const sheet = (
    <div className="fixed inset-0 z-[1000]" aria-modal="true" role="dialog">
      {/* 遮罩 */}
      <button
        aria-label="Close compose"
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => {
          onResult({ kind: "cancel" });
          onClose();
        }}
      />

      {/* 底部面板容器 */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-auto">
          <div
            ref={panelRef}
            style={panelStyle}
            className="rounded-3xl overflow-hidden border border-white/15
                       bg-[rgba(19,24,36,0.75)] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]
                       select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* 顶部把手 */}
            <div className="py-3 grid place-items-center">
              <span className="h-1.5 w-12 rounded-full bg-white/22" />
            </div>

            {/* 选项列表 */}
            <ul className="px-2 pb-2 text-[15px]">
              <li>
                <button
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5" />
                  Choose from gallery
                </button>
              </li>

              <li>
                <button
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white"
                  onClick={() => {
                    // 移动端相机（有些浏览器仅在 <input> 上支持 capture，
                    // 这里先发结果让外层跳到拍摄页/相机组件）
                    onResult({ kind: "camera" });
                    onClose();
                  }}
                >
                  <Camera className="w-5 h-5" />
                  Camera
                </button>
              </li>

              <li>
                <button
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white"
                  onClick={() => {
                    onResult({ kind: "text" });
                    onClose();
                  }}
                >
                  <Type className="w-5 h-5" />
                  Notes
                </button>
              </li>
            </ul>

            {/* 分隔 */}
            <div className="h-px bg-white/10 mx-4" />

            <button
              className="w-full px-4 py-4 text-center text-white/80 hover:bg-white/10"
              onClick={() => {
                onResult({ kind: "cancel" });
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* 隐藏文件选择器（相册） */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        // 某些移动端浏览器支持 capture，若你想默认打开相机，可加上：
        // capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onResult({ kind: "image", files });
          onClose();
          // 允许重复选择同一张
          e.currentTarget.value = "";
        }}
      />
    </div>
  );

  return createPortal(sheet, document.body);
}
