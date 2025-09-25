// src/lib/postSocialClient.ts
import { supabase } from "../lib/supabaseClient";

/** 輕量貼文：僅用到前端列表需要的欄位 */
export type LitePost = {
  id: string;
  author_id: string | null;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profiles?:
    | {
        full_name?: string | null;
        avatar_url?: string | null;
        school?: string | null; // 👈 新增：帶回學校，供 UI 後備顯示
      }
    | null;
};

async function getUid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error("Please sign in first.");
  return data.user.id;
}

/**
 * 給一串 post id，取回貼文 + 作者 profile（從 view 讀，避免關聯歧義）
 */
async function fetchPostsWithProfiles(ids: string[]): Promise<LitePost[]> {
  if (!ids.length) return [];
  const uniqIds = Array.from(new Set(ids));

  const { data, error } = await supabase
    .from("posts_with_author")
    .select(
      "id, author_id, title, content, image_url, created_at, author_name, author_avatar, author_school"
    )
    .in("id", uniqIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    author_id: p.author_id,
    title: p.title,
    content: p.content,
    image_url: p.image_url ?? null,
    created_at: p.created_at,
    profiles: {
      full_name: p.author_name ?? null,
      avatar_url: p.author_avatar ?? null,
      school: p.author_school ?? null, // 👈
    },
  }));
}

/** 我點讚過的帖子 */
export async function fetchMyLikedPosts(): Promise<LitePost[]> {
  const uid = await getUid();
  const { data: rows, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (rows || []).map((r: any) => r.post_id).filter(Boolean);
  return fetchPostsWithProfiles(ids);
}

/** 我收藏過的帖子 */
export async function fetchMyBookmarkedPosts(): Promise<LitePost[]> {
  const uid = await getUid();
  const { data: rows, error } = await supabase
    .from("post_saves")
    .select("post_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (rows || []).map((r: any) => r.post_id).filter(Boolean);
  return fetchPostsWithProfiles(ids);
}

/** 我自己發過的帖子（給 My Post 區塊用） */
export async function fetchMyPosts(): Promise<LitePost[]> {
  const uid = await getUid();
  const { data, error } = await supabase
    .from("posts_with_author")
    .select(
      "id, author_id, title, content, image_url, created_at, author_name, author_avatar, author_school"
    )
    .eq("author_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    author_id: p.author_id,
    title: p.title,
    content: p.content,
    image_url: p.image_url ?? null,
    created_at: p.created_at,
    profiles: {
      full_name: p.author_name ?? null,
      avatar_url: p.author_avatar ?? null,
      school: p.author_school ?? null, // 👈
    },
  }));
}

/** 取某位用戶自己發過的貼文（用 view，避免外鍵別名衝突） */
export async function fetchUserPosts(userId: string): Promise<LitePost[]> {
  const { data, error } = await supabase
    .from("posts_with_author")
    .select(
      "id, author_id, title, content, image_url, created_at, author_name, author_avatar, author_school"
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((p: any) => ({
    id: p.id,
    author_id: p.author_id,
    title: p.title,
    content: p.content,
    image_url: p.image_url ?? null,
    created_at: p.created_at,
    profiles: {
      full_name: p.author_name ?? null,
      avatar_url: p.author_avatar ?? null,
      school: p.author_school ?? null, // 👈
    },
  }));
}
