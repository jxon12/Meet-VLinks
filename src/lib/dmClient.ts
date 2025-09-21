// src/lib/dmClient.ts
import { supabase } from "./supabaseClient";

export type DM = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
};

export type DMMessage = {
  id: string;
  dm_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

async function getUid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Please sign in first.");
  return data.user.id;
}

/** 建立或取得雙方 DM（優先走 RPC；沒有 RPC 時使用備援查/建，且正規化配對順序避免重複） */
export async function getOrCreateDM(otherUserId: string): Promise<DM> {
  // 1) 先試 RPC（容錯：可能回整筆或只回 id）
  const { data: rpc, error: rpcErr } = await supabase.rpc("get_or_create_dm", {
    other_user: otherUserId,
  });
  if (!rpcErr && rpc) {
    if (typeof rpc === "string") {
      // 只回 id → 再 select
      const { data, error } = await supabase.from("dms").select("*").eq("id", rpc).single();
      if (error) throw error;
      return data as DM;
    }
    return rpc as DM;
  }

  // 2) 備援（正規化配對順序，避免重複 pair）
  const me = await getUid();
  const a = me < otherUserId ? me : otherUserId;
  const b = me < otherUserId ? otherUserId : me;

  // 查現有
  const { data: found, error: findErr } = await supabase
    .from("dms")
    .select("*")
    .eq("user_a", a)
    .eq("user_b", b)
    .limit(1);
  if (findErr) throw findErr;
  if (found && found.length) return found[0] as DM;

  // 沒有就建
  const { data: created, error: insErr } = await supabase
    .from("dms")
    .insert([{ user_a: a, user_b: b }])
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as DM;
}

export async function fetchMessages(dmId: string, limit = 50): Promise<DMMessage[]> {
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, dm_id, sender_id, body, created_at")
    .eq("dm_id", dmId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []) as DMMessage[];
}

export async function sendMessage(dmId: string, body: string) {
  const me = await getUid();
  const text = body.trim();
  if (!text) return;
  const { error } = await supabase.from("dm_messages").insert([{ dm_id: dmId, sender_id: me, body: text }]);
  if (error) throw error;
}

/** 訂閱這個 DM 新訊息；回傳 unsubscribe 函數 */
export function subscribeDM(dmId: string, onNew: (msg: DMMessage) => void) {
  const ch = supabase
    .channel(`dm:${dmId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_messages", filter: `dm_id=eq.${dmId}` },
      (payload) => onNew(payload.new as DMMessage)
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}
