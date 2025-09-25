// src/features/pet/Sheet.tsx
import React from "react";
import { createPortal } from "react-dom";

export default function Sheet({
  title, open, onClose, children,
}: React.PropsWithChildren<{ title: string; open: boolean; onClose: () => void }>) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[900]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto">
        <div className="mx-3 sm:mx-auto max-w-md rounded-2xl border border-white/10 bg-[#0B1220]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="font-medium">{title}</div>
            <button onClick={onClose} className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-sm">Close</button>
          </div>
          <div className="p-3">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
