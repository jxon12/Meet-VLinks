import React, { useEffect, useState } from "react";
import JellyfishShell from "./JellyfishShell";
import { MapPin, CloudSun, CloudRain, Snowflake, Wind, Droplets } from "lucide-react";

/** 可选：简单问候 */
function greetingByTime(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "Good morning";
  if (h >= 11 && h < 16) return "Good afternoon";
  if (h >= 16 && h < 21) return "Good evening";
  return "Good night";
}

type Weather = {
  tempC: number;
  condition: string;
  icon: string;     // OpenWeather 图标码
  humidity: number;
  wind: number;     // m/s
  city?: string;
};

type Props = {
  /** 如果你已有天气数据，可以直接传（将不会发起定位/请求） */
  data?: Weather;
  /** OpenWeather 的 API Key（也可以从 env 注入） */
  apiKey?: string;
};

export default function WeatherJelly({ data, apiKey }: Props) {
  const [weather, setWeather] = useState<Weather | null>(data ?? null);
  const [loading, setLoading] = useState(!data);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) return; // 已有数据
    if (!apiKey) {
      setErr("Missing OpenWeather API key");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        // 1) 取地理位置
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 });
        });

        if (cancelled) return;
        const { latitude, longitude } = pos.coords;

        // 2) 调 OpenWeather Current Weather API
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (cancelled) return;
        const w: Weather = {
          tempC: Math.round(j.main?.temp ?? 0),
          condition: j.weather?.[0]?.main || "—",
          icon: j.weather?.[0]?.icon || "01d",
          humidity: j.main?.humidity ?? 0,
          wind: j.wind?.speed ?? 0,
          city: j.name,
        };
        setWeather(w);
        setErr(null);
      } catch (e: any) {
        const msg = e?.message || "Failed to get weather";
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [apiKey, data]);

  // 小图标选择
  function BigIcon({ cond }: { cond: string }) {
    const c = cond.toLowerCase();
    if (c.includes("rain")) return <CloudRain className="w-6 h-6" />;
    if (c.includes("snow")) return <Snowflake className="w-6 h-6" />;
    return <CloudSun className="w-6 h-6" />;
  }

  return (
    <div className="w-full">
      <JellyfishShell period="auto" className="select-none">
        <div className="p-4">
          {/* 顶部：问候 + 城市 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/85">{greetingByTime()}</div>
            <div className="flex items-center gap-1 text-xs text-white/70">
              <MapPin className="w-3.5 h-3.5" />
              <span>{weather?.city || (loading ? "Locating…" : err ? "Location off" : "—")}</span>
            </div>
          </div>

          {/* 主体：温度 + 天气 */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-semibold tracking-tight">
                {weather ? `${weather.tempC}°` : loading ? "—" : "—"}
              </div>
              <div className="text-white/75 text-sm">{weather?.condition || (loading ? "Loading…" : err ? "Unavailable" : "—")}</div>
            </div>
            <div className="opacity-90">
              <BigIcon cond={weather?.condition || ""} />
            </div>
          </div>

          {/* 辅助信息 */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-white/75">
            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 backdrop-blur px-2 py-1">
              <Droplets className="w-3.5 h-3.5" />
              <span>Humidity</span>
              <span className="ml-auto text-white/90">{weather ? `${weather.humidity}%` : "—"}</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 backdrop-blur px-2 py-1">
              <Wind className="w-3.5 h-3.5" />
              <span>Wind</span>
              <span className="ml-auto text-white/90">{weather ? `${Math.round(weather.wind)} m/s` : "—"}</span>
            </div>
          </div>

          {/* 错误或权限提示（不打断 UI） */}
          {err && (
            <div className="mt-2 text-[11px] text-amber-300/90">
              {err.includes("permission") ? "Please allow location to show local weather." : err}
            </div>
          )}
        </div>
      </JellyfishShell>
    </div>
  );
}
