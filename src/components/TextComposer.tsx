// src/components/TextComposer.tsx
import React, { useEffect, useRef, useState } from "react";
import { createTextPost } from "../api/posts";

type Props = {
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
};

export default function TextComposer({ open, onClose, onPosted }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    const t = setTimeout(() => firstRef.current?.focus(), 50);
    return () => { document.removeEventListener("keydown", onEsc); clearTimeout(t); };
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await createTextPost(title.trim() || null, content.trim());
      setTitle(""); setContent("");
      onPosted?.();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1001] flex items-end sm:items-center sm:justify-center">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md sm:rounded-2xl sm:overflow-hidden sm:border sm:border-white/15 bg-[#121827]/90 backdrop-blur-xl shadow-2xl">
        <div className="p-4">
          <h3 className="text-white/90 font-semibold mb-3">New note</h3>
          <input
            ref={firstRef}
            className="w-full mb-2 h-11 px-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-white/35"
            placeholder="Title (optional)"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
          />
          <textarea
            className="w-full h-36 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-white/35"
            placeholder="Write something kind or helpful…"
            value={content}
            onChange={(e)=>setContent(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-white/20 text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              disabled={!content.trim() || submitting}
              onClick={submit}
              className="px-4 h-10 rounded-xl bg-white text-black border border-white/20 disabled:opacity-60"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
