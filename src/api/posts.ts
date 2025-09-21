// src/api/posts.ts
import { supabase } from "../lib/supabaseClient";

/* ------------ constants ------------ */
const BUCKET = "post-images";


/* ------------ types ------------ */
export type DBPost = {
  id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  title?: string | null;
  content?: string | null;
  image_url?: string | null;
  created_at: string;
  liked?: boolean;
  saved?: boolean;
};

/* ------------ helpers ------------ */
async function getCurrentUserOrThrow() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error("Please sign in");
  return user;
}

async function getProfileSnapshot(userId: string): Promise<{ name: string | null; avatar: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();
  // 116 = no rows
  if (error && (error as any).code !== "PGRST116") throw error;
  return { name: data?.full_name ?? null, avatar: data?.avatar_url ?? null };
}

export function storagePathFromPublicUrl(publicUrl: string, bucket = BUCKET): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

export async function getPublicURLSafely(path: string) {
  if (!path) throw new Error("No storage path");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error(`Public URL not available — check bucket "${BUCKET}" visibility or storage RLS policies.`);
  }
  return data.publicUrl;
}

/* ------------ feed ------------ */
export async function fetchFeed(): Promise<DBPost[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id || null;

  // Fetch posts with author profile data using the correct foreign key relationship
  const { data, error } = await supabase
    .from("posts")
    .select(`
      id, 
      author_id, 
      title, 
      content, 
      image_url, 
      created_at,
      profiles!posts_author_fk(full_name, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = (data || []).map((r: any) => ({
    id: r.id,
    author_id: r.author_id,
    author_name: r.profiles?.full_name ?? null,
    author_avatar: r.profiles?.avatar_url ?? null,
    title: r.title ?? null,
    content: r.content ?? null,
    image_url: r.image_url ?? null,
    created_at: r.created_at,
  }));

  if (!uid) {
    return rows.map((r) => ({ ...r, liked: false, saved: false }));
  }

  const [likesRes, savesRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", uid).limit(200),
    supabase.from("post_saves").select("post_id").eq("user_id", uid).limit(200),
  ]);
  if (likesRes.error) throw likesRes.error;
  if (savesRes.error) throw savesRes.error;

  const likedSet = new Set((likesRes.data || []).map((x) => x.post_id));
  const savedSet = new Set((savesRes.data || []).map((x) => x.post_id));

  return rows.map((r) => ({
    ...r,
    liked: likedSet.has(r.id),
    saved: savedSet.has(r.id),
  }));
}

/* ------------ create text post ------------ */
export async function createTextPost(title: string | null, content: string) {
  const user = await getCurrentUserOrThrow();
  // 這裡 snapshot 只用於未來需要，但目前不寫入 posts（避免缺欄位錯誤）
  await getProfileSnapshot(user.id);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: title ?? null,
      content: content ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DBPost;
}

/* ------------ upload image + create post ------------ */
export async function uploadImageAndCreatePost(file: File, title?: string, content?: string) {
  const user = await getCurrentUserOrThrow();
  await getProfileSnapshot(user.id);

  const ext = file.name.split(".").pop() || "bin";
  const path = `posts/${user.id}/${Date.now()}.${ext}`;

  const { data: up, error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) {
    throw new Error(upErr.message || `Upload failed — check bucket "${BUCKET}" and storage policies.`);
  }

  const publicUrl = await getPublicURLSafely(up.path);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      title: title || null,
      content: content || null,
      image_url: publicUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DBPost;
}

/* ------------ update ------------ */
export async function updatePost(
  post_id: string,
  payload: { title?: string | null; content?: string | null }
) {
  const user = await getCurrentUserOrThrow();
  // ✅ v2 需要 .select().single() 來避免白屏（無返回造成錯誤）
  const { error } = await supabase
    .from("posts")
    .update({
      title: payload.title ?? null,
      content: payload.content ?? null,
    })
    .eq("id", post_id)
    .eq("author_id", user.id)
    .select()
    .single();
  if (error) throw error;
}

/* ------------ delete (with storage) ------------ */
export async function deletePost(post_id: string) {
  const user = await getCurrentUserOrThrow();

  const { data: post, error: gErr } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", post_id)
    .eq("author_id", user.id)
    .single();
  if (gErr) throw gErr;

  const url = post?.image_url || null;
  if (url) {
    const path = storagePathFromPublicUrl(url, BUCKET);
    if (path) {
      const { error: delObjErr } = await supabase.storage.from(BUCKET).remove([path]);
      if (delObjErr) console.warn("storage remove failed:", delObjErr.message);
    }
  }

  const { error } = await supabase.from("posts").delete().eq("id", post_id).eq("author_id", user.id);
  if (error) throw error;
}

/* ------------ like/save ------------ */
export async function toggleLike(post_id: string, on: boolean) {
  const user = await getCurrentUserOrThrow();
  if (on) {
    // ✅ v2 upsert 不需要 ignoreDuplicates
    const { error } = await supabase.from("post_likes").upsert(
      { post_id, user_id: user.id },
      { onConflict: "post_id,user_id" }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", user.id);
    if (error) throw error;
  }
}

export async function toggleSave(post_id: string, on: boolean) {
  const user = await getCurrentUserOrThrow();
  if (on) {
    const { error } = await supabase.from("post_saves").upsert(
      { post_id, user_id: user.id },
      { onConflict: "post_id,user_id" }
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("post_saves")
      .delete()
      .eq("post_id", post_id)
      .eq("user_id", user.id);
    if (error) throw error;
  }
}