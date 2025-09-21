// src/components/SecuritySheet.tsx
import React from "react";
import { X } from "lucide-react";

export default function SecuritySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#0c1526] border border-white/15 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white/95 font-semibold">Account Security</div>
          <button
            onClick={onClose}
            className="rounded-full p-2 border border-white/20 bg-white/5 hover:bg-white/10"
          >
          

        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/90 mb-2">Change Password</div>
            <div className="space-y-2">
              <input className="w-full h-10 rounded-lg bg-white/5 border border-white/15 px-3" placeholder="Current password" type="password" />
              <input className="w-full h-10 rounded-lg bg-white/5 border border-white/15 px-3" placeholder="New password" type="password" />
              <input className="w-full h-10 rounded-lg bg-white/5 border border-white/15 px-3" placeholder="Confirm new password" type="password" />
              <button className="w-full h-10 rounded-lg bg-white text-black border border-white/25 hover:bg-white/90 transition">
                Save
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/90">Two-Factor Authentication</div>
                <div className="text-white/60 text-xs">Add a second step for login.</div>
              </div>
              <div className="text-white/60 text-xs">Coming soon</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/90 mb-1">Active Sessions</div>
            <div className="text-white/60 text-xs">This device · Last active: just now</div>
          </div>
        </div>
      </div>
    </div>
  );
}
