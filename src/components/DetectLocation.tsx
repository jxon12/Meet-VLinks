// src/components/DetectLocation.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  /** 可选：拿到最终文本（如 "Malaysia · Kuala Lumpur · iPhone · Safari"）给外层用 */
  onDetect?: (summary: string, detail: { country?: string; city?: string; lat?: number; lon?: number; device?: string }) => void;
};

export default function DetectLocation({ onDetect }: Props) {
  const [location, setLocation] = useState<string>("Detecting location…");
  const [device, setDevice] = useState<string>("Detecting device…");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 设备解析（尽量轻，足够“朋友圈”风格）
  const detectDevice = () => {
    const ua = navigator.userAgent;
    let d = "";
    if (/iphone/i.test(ua)) d = "iPhone";
    else if (/ipad/i.test(ua)) d = "iPad";
    else if (/android/i.test(ua)) d = "Android";
    else if (/mac/i.test(ua)) d = "Mac";
    else if (/windows/i.test(ua)) d = "Windows PC";
    else d = "Device";

    if (/crios|chrome/i.test(ua)) d += " · Chrome";
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) d += " · Safari";
    else if (/firefox/i.test(ua)) d += " · Firefox";
    else if (/edg/i.test(ua)) d += " · Edge";

    setDevice(d);
    return d;
  };

  useEffect(() => {
    const d = detectDevice();

    if (!("geolocation" in navigator)) {
      const msg = "Geolocation not supported by this browser.";
      setError(msg);
      setLocation("Unknown place");
      onDetect?.(`${"Unknown place"} · ${d}`, { device: d });
      return;
    }

    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // 反向地理编码（Nominatim）
        try {
          abortRef.current?.abort();
          const ac = new AbortController();
          abortRef.current = ac;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { signal: ac.signal, headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();

          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county ||
            undefined;
          const country = data?.address?.country || undefined;

          const locText =
            country && city ? `${country} · ${city}` :
            country ? `${country}` :
            city ? `${city}` :
            "Somewhere on Earth";

          setLocation(locText);
          const summary = `${locText} · ${d}`;
          onDetect?.(summary, { country, city, lat: latitude, lon: longitude, device: d });
        } catch (e: any) {
          // 反代失败就展示经纬度兜底
          const fallback = `Lat ${latitude.toFixed(3)}, Lon ${longitude.toFixed(3)}`;
          setLocation(fallback);
          onDetect?.(`${fallback} · ${d}`, { lat: latitude, lon: longitude, device: d });
        }
      },
      (err) => {
        // 拒绝/失败：展示原因 + 设备
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied."
            : err.code === err.POSITION_UNAVAILABLE
            ? "Location unavailable."
            : err.code === err.TIMEOUT
            ? "Location request timed out."
            : `Location error: ${err.message}`;
        setError(msg);
        setLocation("Unknown place");
        onDetect?.(`${"Unknown place"} · ${d}`, { device: d });
      },
      opts
    );

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 text-white">
      <div className="text-sm opacity-70 mb-1">Location</div>
      <div className="text-lg">{location}</div>

      <div className="mt-4 text-sm opacity-70 mb-1">Device</div>
      <div className="text-lg">{device}</div>

      {error && <div className="mt-4 text-rose-300 text-sm">{error}</div>}

      {/* 小提示：仅在本地开发/HTTPS下可用 */}
      <div className="mt-6 text-xs text-white/60">
        Tip: Geolocation requires HTTPS (or localhost). If it shows “Unknown”, check browser permissions.
      </div>
    </div>
  );
}
