import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Props = { userId: string; open: boolean; onClose: () => void };

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  school: string | null;
  club?: string | null;
  hobby?: string | null;
};

type UserPost = {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ProfileOverlay({ userId, open, onClose }: Props) {
  const [prof, setProf] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, school, club, hobby")
          .eq("id", userId)
          .single();
        if (pErr) throw pErr;
        setProf(p as any);

        const { data: myPosts, error: mErr } = await supabase
          .from("posts")
          .select("id, content, image_url, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false });
        if (mErr) throw mErr;
        setPosts(myPosts || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[rgba(18,26,41,0.95)] backdrop-blur-2xl shadow-xl overflow-hidden">
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="text-white/90 font-medium">Profile</div>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-white/90" />
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-white/70 text-sm">Loading…</div>
            ) : !prof ? (
              <div className="text-white/70 text-sm">User not found.</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} className="w-12 h-12 rounded-full border border-white/20 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/15 border border-white/20" />
                  )}
                  <div>
                    <div className="text-white/95 font-semibold">{prof.full_name ?? "Unknown"}</div>
                    <div className="text-xs text-white/70">{prof.school ?? "—"}</div>
                    <div className="text-[11px] text-white/60">
                      {prof.club ? `Club: ${prof.club}` : ""} {prof.hobby ? `• Hobby: ${prof.hobby}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-white/85">Posts</div>
                {posts.length === 0 ? (
                  <div className="text-white/60 text-sm mt-2">No posts yet.</div>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2 max-h-[46vh] overflow-auto pr-1">
                    {posts.map((p) => (
                      <div key={p.id} className="rounded-xl border border-white/15 bg-white/5 p-2">
                        {p.image_url ? (
                          <img src={p.image_url} className="w-full h-28 object-cover rounded-lg border border-white/10" />
                        ) : (
                          <div className="w-full h-28 rounded-lg bg-white/10 border border-white/10 grid place-items-center text-xs text-white/60">
                            {p.content?.slice(0, 40) || "No content"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
