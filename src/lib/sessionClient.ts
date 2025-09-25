// src/lib/sessionClient.ts
import { supabase } from "./supabaseClient";

const KEY = "vlinks:session_key";

function uuid() {
  return crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

export function getOrCreateSessionKey() {
  let k = localStorage.getItem(KEY);
  if (!k) { k = uuid(); localStorage.setItem(KEY, k); }
  return k;
}

function deviceLabelFromUA(ua = navigator.userAgent) {
  const isMobile = /Mobile|iPhone|Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWin = /Windows NT/i.test(ua);
  const isLinux = /Linux/i.test(ua);
  const browser =
    /Chrome\/|Chromium\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) && !/Chrome\//.test(ua) ? "Safari" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Edg\//.test(ua) ? "Edge" : "Browser";
  const os = isIOS ? "iOS" : isAndroid ? "Android" : isMac ? "Mac" : isWin ? "Windows" : isLinux ? "Linux" : "Device";
  return `${browser} • ${os}${isMobile ? " (Mobile)" : ""}`;
}

export async function upsertCurrentSessionRow() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const session_key = getOrCreateSessionKey();
  const device_label = deviceLabelFromUA();
  const locale = navigator.language || "en";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const ua = navigator.userAgent;

  await supabase.from("user_sessions").upsert({
    user_id: user.id,
    session_key,
    device_label,
    ua,
    locale,
    tz,
    last_seen: new Date().toISOString(),
  }, { onConflict: "user_id,session_key" });
}

export async function heartbeatSession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const session_key = getOrCreateSessionKey();
  await supabase.from("user_sessions").update({
    last_seen: new Date().toISOString(),
  }).eq("user_id", user.id).eq("session_key", session_key);
}

export async function markOtherSessionsRevoked() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const session_key = getOrCreateSessionKey();
  await supabase.from("user_sessions")
    .update({ revoked: true })
    .eq("user_id", user.id)
    .neq("session_key", session_key);
}

export async function revokeOneSession(targetKey: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_sessions")
    .update({ revoked: true })
    .eq("user_id", user.id)
    .eq("session_key", targetKey);
}

/* -------------------- 新增：提供给 Security.tsx 的统一导出 -------------------- */

type DBRow = {
  user_id: string;
  session_key: string;
  device_label: string | null;
  ua?: string | null;
  locale?: string | null;
  tz?: string | null;
  last_seen?: string | null;
  revoked?: boolean | null;
};

export type DeviceSession = {
  id: string;               // session_key
  browser: string;
  os: string;
  locale?: string;
  tz?: string;
  last_seen_at?: string;
  is_current?: boolean;
};

// 把 "Chrome • Mac (Mobile)" 解析成 { browser, os }
function parseDeviceLabel(label?: string | null) {
  if (!label) return { browser: "Browser", os: "Device" };
  const [b, oRaw] = label.split("•").map((s) => s.trim());
  const os = (oRaw || "Device").replace(/\s*\(Mobile\)\s*/i, "").trim();
  const browser = b || "Browser";
  return { browser, os };
}

// 列出当前用户的未撤销会话（按 last_seen 倒序）
export async function listSessions(): Promise<DeviceSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const currentKey = getOrCreateSessionKey();

  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", user.id)
    .or("revoked.is.null,revoked.eq.false")
    .order("last_seen", { ascending: false });

  if (error) throw error;

  return (data as DBRow[]).map((r) => {
    const { browser, os } = parseDeviceLabel(r.device_label);
    return {
      id: r.session_key,
      browser,
      os,
      locale: r.locale || undefined,
      tz: r.tz || undefined,
      last_seen_at: r.last_seen || undefined,
      is_current: r.session_key === currentKey,
    };
  });
}

// 注销某个设备（把该会话标记为 revoked）
export async function signOutSession(sessionId: string) {
  await revokeOneSession(sessionId);
}

// 注销除了本机之外的所有设备
export async function signOutAllExceptThis() {
  await markOtherSessionsRevoked();
}