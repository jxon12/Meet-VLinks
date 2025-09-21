// src/components/InstallA2HSModal.tsx
import React from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onInstall?: () => void;   // Android 用
  canOneTapInstall: boolean; // 有 beforeinstallprompt 时为 true
  isIOS: boolean;
};

export default function InstallA2HSModal({ open, onClose, onInstall, canOneTapInstall, isIOS }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[rgba(15,23,42,0.85)] text-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-lg font-semibold"> Install Vlinks</div>
          <p className="mt-2 text-white/70 text-sm">
            Add Vlinks to your Home Screen for a smoother, app-like experience.
          </p>

          {canOneTapInstall && !isIOS ? (
            <button
              onClick={onInstall}
              className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-3 bg-white text-black font-medium border border-white/25 hover:bg-white/90 transition"
            >
              Install now
            </button>
          ) : (
            <div className="mt-5 text-left text-sm space-y-3 bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="font-medium">iPhone / iPad</div>
              <ol className="list-decimal list-inside text-white/80 space-y-1">
                <li>Tap the <span className="font-medium">Share</span> button in Safari.</li>
                <li>Choose <span className="font-medium">Add to Home Screen</span>.</li>
                <li>Tap <span className="font-medium">Add</span>.</li>
              </ol>
              <div className="opacity-70 text-xs">
                Psst...wanna find me faster? Add Vlinks to your homescreen lah 👉🏻👈🏻
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 border border-white/20 hover:bg-white/10 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
