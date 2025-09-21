import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

function getOrCreateDeviceId() {
  const KEY = "vlinks:device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function useDeviceTracker() {
  const tick = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;

    async function ping() {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return; // 未登录不追踪
        const device_id = getOrCreateDeviceId();

        await fetch(${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-device, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: Bearer ${session.access_token},
          },
          body: JSON.stringify({ device_id }),
        });
      } catch (e) {
        // 静默
      }
    }

    // 首次 + 每隔 5 分钟（仅当页面可见）
    ping();
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);

    tick.current = window.setInterval(() => {
      if (document.visibilityState === "visible") ping();
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (tick.current) window.clearInterval(tick.current);
      stopped = true;
    };
  }, []);
}