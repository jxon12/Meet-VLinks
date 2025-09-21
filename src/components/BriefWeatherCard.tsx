import React from "react";

export default function BriefWeatherCard({
  greeting = "Have a gentle morning",
  location = "Kuala Lumpur",
  temp = "28°",
  summary = "Light clouds · Calm breeze",
}: {
  greeting?: string;
  location?: string;
  temp?: string;
  summary?: string;
}) {
  return (
    <div className="p-4 text-white/90">
      <div className="text-sm opacity-90">{greeting}</div>
      <div className="mt-1 text-xs opacity-70">{location}</div>

      <div className="mt-3 flex items-end gap-3">
        <div className="text-4xl leading-none">{temp}</div>
        <div className="text-xs opacity-75">{summary}</div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-[11px] opacity-80">
        {["9 AM", "12 PM", "3 PM", "6 PM"].map((t, i) => (
          <div
            key={t}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center"
          >
            <div>{t}</div>
            <div className="mt-0.5">{28 + i}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}
