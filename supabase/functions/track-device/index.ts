// Deno deploy runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function parseUA(ua = "") {
  const low = ua.toLowerCase();
  const isMobile = /mobile|iphone|android|ipad|ipod/.test(low);
  let os = "Unknown OS";
  if (/windows/.test(low)) os = "Windows";
  else if (/mac os|macintosh/.test(low)) os = "macOS";
  else if (/android/.test(low)) os = "Android";
  else if (/ios|iphone|ipad|ipod/.test(low)) os = "iOS";
  else if (/linux/.test(low)) os = "Linux";

  let browser = "Unknown";
  if (/chrome\/\d+/.test(low) && !/edge|edg\//.test(low)) browser = "Chrome";
  else if (/safari\/\d+/.test(low) && /version\/\d+/.test(low)) browser = "Safari";
  else if (/firefox\/\d+/.test(low)) browser = "Firefox";
  else if (/edg\//.test(low)) browser = "Edge";

  return { os, browser, isMobile };
}

serve(async (req) => {
  try {
    // 1) 认证：前端用 access_token 放在 Authorization: Bearer <token>
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: Bearer ${token} } },
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return new Response("Unauthorized", { status: 401 });
    const user = userRes.user;

    // 2) 拿 UA / IP / 区域
    const ua = req.headers.get("user-agent") || "";
    const { os, browser, isMobile } = parseUA(ua);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || null;

    // 部分边缘网络会注入这些 header（不保证都有）
    const country = req.headers.get("x-country") || req.headers.get("cf-ipcountry") || null;
    const region = req.headers.get("x-region") || null;
    const city = req.headers.get("x-city") || null;

    // 3) body: { device_id: string }
    const body = await req.json().catch(() => ({}));
    const device_id = body?.device_id || crypto.randomUUID();

    // 4) upsert
    const { data: exist, error: qErr } = await supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("device_id", device_id)
      .maybeSingle();

    const isNew = !exist;

    const up = {
      user_id: user.id,
      device_id,
      ua,
      os,
      browser,
      is_mobile: isMobile,
      ip,
      city,
      region,
      country,
      last_seen: new Date().toISOString(),
      ...(isNew ? { first_seen: new Date().toISOString() } : {}),
    };

    const { error: upErr } = await supabase
      .from("user_devices")
      .upsert(up, { onConflict: "user_id,device_id" });

    if (upErr) throw upErr;

    // 5) 新设备 -> 记录事件（你以后可在这里加 SendGrid 邮件发送）
    if (isNew) {
      await supabase.from("security_events").insert({
        user_id: user.id,
        type: "new_device",
        context: up,
      });
    }

    return new Response(JSON.stringify({ ok: true, isNew, device_id }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response("Error", { status: 500 });
  }
});