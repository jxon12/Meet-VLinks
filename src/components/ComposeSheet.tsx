// src/components/ComposeSheet.tsx
import React, { useRef, useEffect } from "react";
import { Image as ImageIcon, Camera, Type } from "lucide-react";
import { createPortal } from "react-dom";

export type ComposeResult =
  | { kind: "image"; files: File[] }
  | { kind: "camera" } // 兜底：设备不支持 capture 时回退
  | { kind: "text" }
  | { kind: "cancel" };

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (r: ComposeResult) => void;
};

export default function ComposeSheet({ open, onClose, onResult }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Esc 关闭 + 防页面滚动 + 打开后聚焦到第一个按钮
  useEffect(() => {
    if (!open) return;

    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 打开后把焦点放到第一个操作，方便键盘用户
    const t = setTimeout(() => firstButtonRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  // 支持粘贴图片（面板打开时 ctrl/cmd+v 直接贴图）
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) {
        onResult({ kind: "image", files });
        onClose();
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, onClose, onResult]);

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[1000] flex items-end"
      aria-modal="true"
      role="dialog"
      aria-label="Create a post"
    >
      {/* 遮罩 */}
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity data-[enter]:opacity-100 data-[leave]:opacity-0"
        onClick={onClose}
        aria-label="Close compose"
      />

      {/* 面板 */}
      <div className="relative w-full">
        <div className="mx-auto max-w-md px-4 pb-6 w-full">
          <div
            className="rounded-3xl overflow-hidden border border-white/15
                       bg-[#151a24]/90 backdrop-blur-xl shadow-2xl
                       translate-y-0 opacity-100
                       motion-safe:transition-all motion-safe:duration-200
                       data-[enter]:translate-y-0 data-[enter]:opacity-100
                       data-[leave]:translate-y-6 data-[leave]:opacity-0"
          >
            {/* 顶部把手 */}
            <div className="py-3 grid place-items-center">
              <span className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <ul className="px-2 pb-2 text-[15px]">
              {/* 相册 */}
              <li>
                <button
                  ref={firstButtonRef}
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5" />
                  Choose from gallery
                </button>
              </li>

              {/* 相机（后摄） */}
              <li>
                <button
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  onClick={() => {
                    // 优先用 capture 调起相机；若浏览器不支持就走兜底事件
                    if (cameraRef.current) cameraRef.current.click();
                    else {
                      onResult({ kind: "camera" });
                      onClose();
                    }
                  }}
                >
                  <Camera className="w-5 h-5" />
                  Camera
                </button>
              </li>

              {/* 纯文本/便签 */}
              <li>
                <button
                  className="w-full flex items-center gap-12 px-4 py-4 rounded-2xl hover:bg-white/10 active:scale-[0.99] transition text-white focus:outline-none focus:ring-2 focus:ring-white/20"
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
              className="w-full px-4 py-4 text-center text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
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

      {/* 隐藏文件选择器：相册 */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onResult({ kind: "image", files });
          onClose();
          e.currentTarget.value = ""; // 允许重复选择同一张
        }}
      />

      {/* 隐藏文件选择器：相机（后摄） */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) {
            onResult({ kind: "image", files });
          } else {
            // 某些环境点了“相机”但没返回文件，用兜底事件通知上层
            onResult({ kind: "camera" });
          }
          onClose();
          e.currentTarget.value = "";
        }}
      />
    </div>
  );

  return createPortal(node, document.body);
}
