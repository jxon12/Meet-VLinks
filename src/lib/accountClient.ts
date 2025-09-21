// src/lib/accountClient.ts
import { supabase } from "./supabaseClient";

export async function pauseAccount() {
  // 例：profiles.paused_at = now()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ paused_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;
}

export async function resfumeAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ paused_at: null })
    .eq("id", user.id);
  if (error) throw error;
}
