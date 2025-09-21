// src/components/EditPostDialog.tsx
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  initialTitle: string;
  initialContent: string;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void> | void;
};

export default function EditPostDialog({
  open,
  initialTitle,
  initialContent,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // 每次打開時，把初始值灌進本地狀態，並聚焦
  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? "");
    setContent(initialContent ?? "");
    setErr(null);
    setSaving(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open, initialTitle, initialContent]);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    const t = (title || "").trim();
    const c = (content || "").trim();
    if (!t && !c) {
      setErr("Title or content is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSubmit(t, c);
    } catch (e: any) {
      setErr(e?.message || "Failed to update post.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200]">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      {/* 面板 */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[rgba(18,26,41,0.95)] backdrop-blur-2xl shadow-xl">
          {/* header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="text-white/90 font-medium">Edit Post</div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white/90" />
            </button>
          </div>

          {/* body */}
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs text-white/60 mb-1">Title</label>
              <input
                ref={firstFieldRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="(optional)"
                className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Write something…"
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none focus:border-white/40"
              />
            </div>

            {err && <div className="text-sm text-red-300">{err}</div>}
          </div>

          {/* footer */}
          <div className="px-4 pb-4 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-white/20 text-white/90 hover:bg-white/10 active:scale-95 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
