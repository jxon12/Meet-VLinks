import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { LitePost } from "../lib/postSocialClient";
import { fetchUserPosts } from "../lib/postSocialClient";

type Props = {
  userId: string; 
  open: boolean;
  onClose: () => void;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  school?: string | null;
  club?: string | null;
  hobby?: string | null;
};

export default function ProfileViewer({ userId, open, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<LitePost[]>([]);

  useEffect(() => {
    if (!open || !userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // 讀 profile
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, school, club, hobby")
          .eq("id", userId)
          .single();
        if (error) throw error;
        if (mounted) setProfile(data as Profile);

        
        const list = await fetchUserPosts(userId);
        if (mounted) setPosts(list);

       
        if (mounted && (!data?.school || data.school === "School")) {
          const schoolFromPosts =
            list.find((p) => p.profiles?.school)?.profiles?.school ?? null;
          if (schoolFromPosts) {
            setProfile((prev) =>
              prev ? { ...prev, school: schoolFromPosts } : prev
            );
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[rgba(18,26,41,0.9)] backdrop-blur-2xl shadow-xl">
          
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="text-white/90 text-sm">Profile</div>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-white/70 text-sm">Loading…</div>
          ) : !profile ? (
            <div className="p-6 text-center text-white/70 text-sm">User not found.</div>
          ) : (
            <>
              
              <div className="p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20 bg-white/10">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-white/60 text-sm">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-semibold truncate">
                    {profile.full_name || "Unknown"}
                  </div>
                  <div className="text-white/70 text-xs truncate">
                    {profile.school || "School"}
                  </div>
                  <div className="text-white/60 text-[11px] truncate">
                    {profile.club ? `Club: ${profile.club}` : ""}{" "}
                    {profile.hobby ? `· Hobby: ${profile.hobby}` : ""}
                  </div>
                </div>
              </div>

              {/* Posts */}
              <div className="px-4 pb-4">
                <div className="text-white/85 text-sm mb-2">Posts</div>
                {posts.length === 0 ? (
                  <div className="text-white/60 text-sm py-8 text-center">No posts yet.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {posts.map((p) => {
                      const text = (p.title?.trim() || p.content?.trim() || "") as string;
                      return (
                        <div key={p.id} className="rounded-xl border border-white/15 bg-white/5 overflow-hidden">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={text || "post"}
                              className="w-full aspect-square object-cover"
                              loading="lazy"
                            />
                          ) : (
                           
                            <div className="w-full aspect-square p-3 bg-white/[0.06] grid">
                              <div className="self-start text-[12px] text-white/85 whitespace-pre-wrap line-clamp-6">
                                {text || "…"}
                              </div>
                            </div>
                          )}
                          
                          {text && p.image_url && (
                            <div className="p-2 text-[12px] text-white/85 line-clamp-3">
                              {text}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
