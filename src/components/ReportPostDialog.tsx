import React, { useEffect, useRef, useState } from "react";
import { X, Send, Flag, Check } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; details: string | null }) => Promise<void> | void;
};

const REASONS = [
  "Harassment",
  "Spam",
  "Hate or violence",
  "Self-harm concerns",
  "Misinformation",
  "Other",
];

export default function ReportPostDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  // custom dropdown state
  const [openList, setOpenList] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setReason(REASONS[0]);
    setDetails("");
    setSending(false);
    setOpenList(false);
  }, [open]);

  // click outside to close
  useEffect(() => {
    if (!openList) return;
    const onDocClick = (e: MouseEvent) => {
      if (!listRef.current) return;
      if (!listRef.current.contains(e.target as Node)) setOpenList(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openList]);

  if (!open) return null;

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      await onSubmit({ reason, details: details.trim() || null });
      onClose();
    } catch (e: any) {
      alert(e?.message || "Report failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[72]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[rgba(12,18,28,0.92)] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="text-white/90 font-medium">Report post</div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* body */}
          <div className="p-4 grid gap-4">
            {/* custom dropdown */}
            <div ref={listRef}>
              <label className="block text-xs text-white/70 mb-1">Reason</label>
              <button
                type="button"
                onClick={() => setOpenList((v) => !v)}
                className="w-full h-10 px-3 pr-10 rounded-xl bg-white/5 border border-white/15 text-left text-white focus:outline-none focus:border-white/35 focus:ring-2 focus:ring-white/15 relative"
              >
                {reason}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                  ▾
                </span>
              </button>

              {openList && (
                <div
                  className="mt-2 max-h-56 overflow-auto rounded-xl border border-white/15 bg-[rgba(10,15,25,0.92)] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
                  role="listbox"
                >
                  {REASONS.map((r) => {
                    const active = r === reason;
                    return (
                      <button
                        key={r}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setReason(r);
                          setOpenList(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/10 transition ${
                          active ? "text-white" : "text-white/90"
                        }`}
                      >
                        <span>{r}</span>
                        {active && <Check className="w-4 h-4 text-white/80" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Details (optional)</label>
              <textarea
                rows={5}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us more so we can review quickly…"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-white/35 focus:ring-2 focus:ring-white/15"
              />
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black border border-white/20 hover:bg-white/90 transition disabled:opacity-60"
              >
                {sending ? (
                  <>Sending…</>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* subtle corner accent */}
          <div className="pointer-events-none absolute -inset-px rounded-2xl ring-1 ring-white/10" />
        </div>
      </div>
    </div>
  );
}
