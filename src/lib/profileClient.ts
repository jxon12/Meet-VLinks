// src/lib/profileClient.ts
import { supabase } from "../lib/supabaseClient";

/** 確保當前用戶在 profiles 有一條 row，沒有就用暱稱/學校種下去 */
export async function ensureProfileExists(seed?: {
  full_name?: string | null;
  school?: string | null;
  avatar_url?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return; // 已存在

  const payload: any = {
    id: user.id,
    full_name:
      seed?.full_name ??
      (user.user_metadata?.full_name || user.email?.split("@")[0] || "User"),
    school: seed?.school ?? user.user_metadata?.school ?? null,
    avatar_url: seed?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  };

  const { error: insErr } = await supabase.from("profiles").insert(payload);
  if (insErr) throw insErr;
}

/** 讀取我的 profile */
export async function getMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, school")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

/** 更新我的 profile */
export async function updateMyProfile(upd: {
  full_name?: string | null;
  avatar_url?: string | null;
  school?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  const user = u?.user;
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("profiles")
    .update(upd)
    .eq("id", user.id);
  if (error) throw error;
}
