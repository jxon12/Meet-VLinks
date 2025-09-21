import React from "react";
import { X, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteDialog({ open, onClose, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[72]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[rgba(12,18,28,0.92)] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="text-white/90 font-medium">Delete post</div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="p-4">
            <p className="text-white/80">
              This action cannot be undone. Are you sure you want to delete this post?
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/90 text-white border border-white/20 hover:bg-red-500 transition"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
