import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onRemindTomorrow: () => void;
  onDisableTonight: () => void;
  onDisableForever: () => void;
};

export default function LateNightNudge({
  open,
  onClose,
  onRemindTomorrow,
  onDisableTonight,
  onDisableForever,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white/10 text-white p-5 shadow-2xl">
        <div className="text-base font-medium mb-2">
          Alright, I'm morphing into a blanket burrito. Join me?
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          Tasks can wait. Sleep cannot. Let's bail.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            className="w-full rounded-xl bg-white text-black py-2 border border-white/25 hover:bg-white/90"
            onClick={onRemindTomorrow}
          >
            Remind me tomorrow
          </button>
          <button
            className="w-full rounded-xl bg-white/10 py-2 border border-white/20 hover:bg-white/20"
            onClick={onDisableTonight}
          >
            Don't remind me tonight
          </button>
          <button
            className="w-full rounded-xl bg-white/10 py-2 border border-white/20 hover:bg-white/20"
            onClick={onDisableForever}
          >
            Permanently disabled (can be re-enabled in settings)
          </button>
          <button
            className="w-full rounded-xl py-2 border border-white/10 hover:bg-white/10"
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
