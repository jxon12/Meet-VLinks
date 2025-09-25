// src/components/SimpleComposer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Image as ImageIcon, Loader2, ChevronLeft } from "lucide-react";
import { uploadImageAndCreatePost, createTextPost } from "../api/posts";

type Props = {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
};

type Step = "pick" | "write";

export default function SimpleComposer({ open, onClose, onPublished }: Props) {
  // ✅ 所有 Hook 必须无条件调用
  const [step, setStep] = useState<Step>("pick");
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setFiles([]);
    setTitle("");
    setCaption("");
    setPosting(false);
  }, [open]);

  const canPost = useMemo(() => {
    if (posting) return false;
    return files.length > 0 || title.trim().length > 0 || caption.trim().length > 0;
  }, [files.length, title, caption, posting]);

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const arr = Array.from(list).slice(0, 6);
    setFiles(arr);
    setStep("write");
    e.currentTarget.value = "";
  };

  const removeAt = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  async function handlePublish() {
    if (!canPost) return;
    setPosting(true);
    try {
      if (files.length > 0) {
        await uploadImageAndCreatePost(files[0], title || undefined, caption || undefined);
      } else {
        await createTextPost(title.trim() || null, caption.trim());
      }
      onPublished?.();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Failed to publish.");
    } finally {
      setPosting(false);
    }
  }

  // ✅ 把“不开启时返回 null”放在所有 Hook 之后
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-3xl overflow-hidden border border-white/12 bg-[rgba(16,22,34,0.58)] backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="h-12 px-3 sm:px-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-1.5">
              {step === "write" ? (
                <button
                  onClick={() => setStep("pick")}
                  className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div className="w-9 h-9" />
              )}
              <div className="text-white/90 font-medium tracking-wide">
                {step === "pick" ? "New Post" : "Compose"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {step === "pick" ? (
            <div className="p-5">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 grid place-items-center rounded-xl bg-white/10 border border-white/15">
                    <ImageIcon className="w-5 h-5 text-white/90" />
                  </div>
                  <div className="text-white/85">
                    <div className="font-medium">Choose from gallery</div>
                    <div className="text-sm text-white/60">Select photo(s) to start your post</div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-11 rounded-xl bg-white text-black border border-white/25 hover:bg-white/90 active:scale-[0.98] transition"
                  >
                    Pick photos
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onSelectFiles}
                  />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3 grid-cols-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl border border-dashed border-white/15 bg-white/5" />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setStep("write")}
                  className="w-full h-11 rounded-xl border border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 transition"
                >
                  Write without image
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5">
              {files.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-white/70 mb-2">Selected photos</div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {files.map((f, idx) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <div key={idx} className="relative shrink-0">
                          <img
                            src={url}
                            alt={`picked-${idx}`}
                            className="w-28 h-28 object-cover rounded-xl border border-white/15"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                          <button
                            onClick={() => removeAt(idx)}
                            className="absolute -top-2 -right-2 w-7 h-7 grid place-items-center rounded-full bg-black/60 border border-white/20 hover:bg-black/80"
                            aria-label="Remove"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                <div>
                  <label className="block text-xs text-white/70 mb-1">Title (optional)</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title…"
                    className="w-full h-11 px-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Caption {files.length === 0 ? "(optional)" : ""}
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={files.length > 0 ? "Say something about your photo…" : "Write something…"}
                    rows={5}
                    className="w-full px-3 py-2 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 resize-vertical"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 h-10 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!canPost}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-white text-black border border-white/30 hover:bg-white/90 active:scale-[0.98] transition disabled:opacity-60"
                >
                  {posting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting…
                    </>
                  ) : (
                    <>Post</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
