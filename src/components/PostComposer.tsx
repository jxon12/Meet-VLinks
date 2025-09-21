// src/components/PostComposer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Image as ImageIcon, Camera, Loader2, Check, Trash2, ChevronLeft, ChevronRight
} from "lucide-react";
import { uploadImageAndCreatePost, createTextPost } from "../api/posts";

type Props = { open: boolean; onClose: () => void; onPublished: () => void };

export default function PostComposer({ open, onClose, onPublished }: Props) {
  const [step, setStep] = useState<"pick" | "compose">("pick");
  const [files, setFiles] = useState<File[]>([]);
  const [cursor, setCursor] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const scrollThumbsRef = useRef<HTMLDivElement>(null);

  // reset when opened
  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setFiles([]);
    setCursor(0);
    setTitle("");
    setContent("");
    setSubmitting(false);
  }, [open]);

  // preview urls
  const previewURLs = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previewURLs.forEach((u) => URL.revokeObjectURL(u)), [previewURLs]);

  function onPick(list: FileList | null) {
    if (!list || !list.length) return;
    const arr = Array.from(list);
    setFiles(arr);
    setCursor(0);
    setStep("compose");
    setTimeout(() => scrollThumbsRef.current?.scrollTo({ left: 0, behavior: "smooth" }), 50);
  }

  function removeAt(i: number) {
    const next = files.slice(0, i).concat(files.slice(i + 1));
    setFiles(next);
    setCursor((c) => Math.max(0, Math.min(c, next.length - 1)));
  }

  async function publish() {
    if (submitting) return;
    if (!files.length && !title.trim() && !content.trim()) {
      alert("Please add at least an image, title or content.");
      return;
    }
    setSubmitting(true);
    try {
      if (files.length) {
        // 目前後端一次上傳第一張，之後可擴充多圖
        await uploadImageAndCreatePost(files[0], title.trim() || undefined, content.trim() || undefined);
      } else {
        await createTextPost(title.trim() || null, content.trim());
      }
      onPublished(); // 讓外層關閉並刷新 feed
    } catch (e: any) {
      alert(e?.message || "Publish failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]"> {/* 提高 z，避免被其它浮層蓋住 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="
            w-full max-w-3xl rounded-3xl overflow-hidden
            border border-white/12 bg-[rgba(16,22,34,0.65)] backdrop-blur-2xl
            shadow-[0_30px_90px_rgba(0,0,0,0.55)]
          "
        >
          {/* Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="text-white/95 font-semibold tracking-wide">
              {step === "pick" ? "Create a post" : "Compose"}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="max-h-[78vh] overflow-y-auto">
            {step === "pick" ? (
              <div className="p-6 grid gap-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="
                      h-36 rounded-2xl border border-white/15 
                      bg-white/10 hover:bg-white/15 hover:border-white/30 
                      transition flex flex-col items-center justify-center gap-2
                    "
                  >
                    <ImageIcon className="w-6 h-6" />
                    <div className="text-sm text-white/90">Choose from gallery</div>
                    <div className="text-[11px] text-white/55">Multiple selection supported</div>
                  </button>
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="
                      h-36 rounded-2xl border border-white/15 
                      bg-white/10 hover:bg-white/15 hover:border-white/30 
                      transition flex flex-col items-center justify-center gap-2
                    "
                  >
                    <Camera className="w-6 h-6" />
                    <div className="text-sm text-white/90">Take a photo</div>
                    <div className="text-[11px] text-white/55">Opens device camera</div>
                  </button>
                </div>

                <div className="text-xs text-white/60 text-center">
                  Or publish a text-only post by skipping images.
                </div>

                {/* centered action */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setStep("compose")}
                    className="
                      inline-flex items-center px-5 py-2 rounded-full
                      border border-white/20 bg-white/20 hover:bg-white/30
                      backdrop-blur transition text-white font-medium
                    "
                  >
                    Write without image
                  </button>
                </div>

                {/* hidden inputs */}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files)}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files)}
                />
              </div>
            ) : (
              <div className="p-4 grid gap-5">
                {/* Image preview */}
                {files.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/12 bg-black/30">
                    {previewURLs[cursor] && (
                      <img
                        src={previewURLs[cursor]}
                        alt="preview"
                        className="w-full max-h-[46vh] object-contain bg-black/20"
                      />
                    )}
                    {files.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-black/40 border border-white/20 hover:bg-black/60"
                          onClick={() => setCursor((c) => (c - 1 + files.length) % files.length)}
                          aria-label="Prev"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-black/40 border border-white/20 hover:bg-black/60"
                          onClick={() => setCursor((c) => (c + 1) % files.length)}
                          aria-label="Next"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Thumbnails */}
                {files.length > 0 && (
                  <div ref={scrollThumbsRef} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {previewURLs.map((u, i) => (
                      <div key={i} className="relative shrink-0">
                        <button
                          onClick={() => setCursor(i)}
                          className={`block w-20 h-20 rounded-xl overflow-hidden border ${
                            i === cursor ? "border-white/70" : "border-white/15"
                          }`}
                          title={`Image ${i + 1}`}
                        >
                          <img src={u} className="w-full h-full object-cover" />
                        </button>
                        <button
                          onClick={() => removeAt(i)}
                          className="absolute -right-1 -top-1 w-6 h-6 rounded-full grid place-items-center bg-black/70 border border-white/30"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">Title (optional)</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title…"
                    className="
                      w-full h-11 px-3 rounded-2xl
                      bg-white/10 border border-white/20 text-white placeholder-white/60
                      focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20
                    "
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs text-white/70 mb-1">Content (optional)</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write something thoughtful…"
                    rows={6}
                    className="
                      w-full px-3 py-2 rounded-2xl
                      bg-white/10 border border-white/20 text-white placeholder-white/60
                      focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20
                      resize-vertical
                    "
                  />
                </div>

                <div className="text-[11px] text-white/55">
                  Tip: You can post without images. If multiple images are selected, the first one is uploaded now (multi-image posts can be extended later).
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="h-16 px-4 flex items-center justify-between border-t border-white/10 bg-black/25 backdrop-blur">
            {step === "compose" ? (
              <div className="flex-1 grid place-items-center">
                <button
                  onClick={() => setStep("pick")}
                  className="
                    inline-flex items-center px-5 py-2 rounded-full
                    border border-white/20 bg-white/20 hover:bg-white/30
                    backdrop-blur transition text-white font-medium
                  "
                >
                  Back
                </button>
              </div>
            ) : (
              <span className="text-white/70 text-sm">Ready when you are.</span>
            )}

            <button
              onClick={publish}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-white text-black font-medium border border-white/30 hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Publish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
