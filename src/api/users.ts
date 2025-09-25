// src/api/users.ts
import { supabase } from "./client";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error ?? new Error("No auth user");
  return data.user.id;
}

export async function getProfile(userId?: string): Promise<Profile | null> {
  const id = userId ?? (await getCurrentUserId());
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureProfile(initialName?: string) {
  const userId = await getCurrentUserId();
  const existing = await getProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, display_name: initialName?.trim() || "User" },
      { onConflict: "id" }
    )
    .select("id, display_name, avatar_url")
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateDisplayName(newName: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, display_name: newName.trim() || "User" },
      { onConflict: "id" }
    )
    .select("id, display_name, avatar_url")
    .single();

  if (error) throw error;
  return data as Profile;
}
