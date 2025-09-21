// src/components/Account.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  ChevronDown,
  Bookmark,
  Heart,
  Save,
  Brain,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import useCity from "../hooks/useCity";
import { getMyProfile, updateMyProfile } from "../lib/profileClient";
import type { LitePost } from "../lib/postSocialClient";
import { supabase } from "../lib/supabaseClient";
/* ✅ 讀取我點讚/收藏/發過的貼文 */
import {
  fetchMyLikedPosts,
  fetchMyBookmarkedPosts,
  fetchMyPosts,
} from "../lib/postSocialClient";

type Props = {
  school: string;
  setSchool: (v: string) => void;
  onBack: () => void;
  onSignOut: () => void;
  onOpenCalendar: () => void;
  avatar: string | null;
  setAvatar: (v: string | null) => void;
  onOpenHealth: () => void;
  onOpenSecurity: () => void;
};

const SCHOOLS = ["MMU", "APU", "SUNWAY", "Taylor's"] as const;

const TAG_GROUPS = [
  { key: "club", label: "Club", options: ["IT society", "Hackerspace", "IEEE", "UPG", "AIESEC"] },
  { key: "hobby", label: "Hobby", options: ["Coding", "Photography", "Music", "Gaming"] },
] as const;

type TagKey = (typeof TAG_GROUPS)[number]["key"];
type TagState = Partial<Record<TagKey, string>>;

function MenuPortal({
  anchorRect,
  open,
  children,
  widthMatch = true,
  offsetY = 8,
}: {
  anchorRect: DOMRect | null;
  open: boolean;
  children: React.ReactNode;
  widthMatch?: boolean;
  offsetY?: number;
}) {
  if (!open || !anchorRect) return null;
  return createPortal(
    <div
      className="menu-portal z-[9999] rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl shadow-2xl p-1 text-sm text-white"
      style={{
        position: "fixed",
        top: anchorRect.bottom + offsetY,
        left: anchorRect.left,
        width: widthMatch ? anchorRect.width : undefined,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      {children}
    </div>,
    document.body
  );
}

export default function Account({
  school,
  setSchool,
  onBack,
  onSignOut,
  onOpenCalendar,
  avatar,
  setAvatar,
  onOpenSecurity,
  onOpenHealth,
}: Props) {
  const city = useCity();

  // === state ===
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState<string>("User");
  const [initialName, setInitialName] = useState<string>("User");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // only club/hobby
  const [tags, setTags] = useState<TagState>({});

  // autosave status (for school/club/hobby)
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoOk, setAutoOk] = useState(false);
  const autoTimer = useRef<number | null>(null);

  // dropdowns
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [openTagKey, setOpenTagKey] = useState<TagKey | null>(null);

  // menu anchors
  const pageRef = useRef<HTMLDivElement>(null);
  const schoolBtnRef = useRef<HTMLButtonElement>(null);
  const [schoolRect, setSchoolRect] = useState<DOMRect | null>(null);

  const tagBtnRefs: Record<TagKey, React.RefObject<HTMLButtonElement>> = {
    club: useRef<HTMLButtonElement>(null),
    hobby: useRef<HTMLButtonElement>(null),
  };
  const [tagRect, setTagRect] = useState<DOMRect | null>(null);

  const anyMenuOpen = schoolOpen || openTagKey !== null;

  // ✅ Likes/Bookmarks 計數與清單
  const [likeCount, setLikeCount] = useState(0);
  const [bmCount, setBmCount] = useState(0);
  const [listOpen, setListOpen] = useState<null | "likes" | "bookmarks">(null);
  const [listLoading, setListLoading] = useState(false);
  const [listPosts, setListPosts] = useState<LitePost[]>([]);

  // ✅ 我發過的貼文
  const [myPosts, setMyPosts] = useState<LitePost[]>([]);
  const [myLoading, setMyLoading] = useState<boolean>(true);

  // debounce helper
  function debounce(fn: () => void, ms: number) {
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(fn, ms);
  }

  // === outside click handling ===
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inPage = pageRef.current?.contains(target);
      const inPortal = (target as HTMLElement)?.closest?.(".menu-portal");
      if (inPage || inPortal) return;
      setOpenTagKey(null);
      setSchoolOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, []);

  useLayoutEffect(() => {
    if (!schoolOpen && !openTagKey) return;
    const update = () => {
      if (schoolOpen && schoolBtnRef.current) {
        setSchoolRect(schoolBtnRef.current.getBoundingClientRect());
      }
      if (openTagKey && tagBtnRefs[openTagKey].current) {
        setTagRect(tagBtnRefs[openTagKey].current!.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("resize", update, true);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update, true);
      window.removeEventListener("scroll", update, true);
    };
  }, [schoolOpen, openTagKey]);

  // === dropdown helpers ===
  const toggleSchool = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTagKey(null);
    setSchoolOpen((v) => {
      const next = !v;
      if (next && schoolBtnRef.current) {
        setSchoolRect(schoolBtnRef.current.getBoundingClientRect());
      }
      return next;
    });
  };

  const openTag = (key: TagKey) => {
    setSchoolOpen(false);
    setOpenTagKey((cur) => {
      const next = cur === key ? null : key;
      if (next && tagBtnRefs[key].current) {
        setTagRect(tagBtnRefs[key].current!.getBoundingClientRect());
      }
      return next;
    });
  };

  const selectTag = (key: TagKey, val: string) => {
    setTags((prev) => ({ ...prev, [key]: val }));
    setOpenTagKey(null);
    debounce(() => {
      if (key === "club") autoSavePartial({ club: val });
      if (key === "hobby") autoSavePartial({ hobby: val });
    }, 1000);
  };

  // === file picker / avatar ===
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFile = () => fileRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !uid) return;

    setSaving(true);
    setErr(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      await updateMyProfile({
        id: uid,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      } as any);

      setAvatar(`${publicUrl}?t=${Date.now()}`);
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    } catch (e: any) {
      console.error("avatar upload error:", e);
      setErr(e?.message || "Upload failed");
      alert(e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  // === partial autosave for school/club/hobby ===
  async function autoSavePartial(partial: {
    school?: string | null;
    club?: string | null;
    hobby?: string | null;
  }) {
    if (!uid) return;
    setAutoSaving(true);
    setAutoOk(false);
    setErr(null);
    try {
      await updateMyProfile({
        id: uid,
        ...(partial.school !== undefined ? { school: partial.school } : {}),
        ...(partial.club !== undefined ? { club: partial.club } : {}),
        ...(partial.hobby !== undefined ? { hobby: partial.hobby } : {}),
        updated_at: new Date().toISOString(),
      } as any);
      setAutoOk(true);
      setTimeout(() => setAutoOk(false), 800);
    } catch (e: any) {
      setErr(e?.message || "Auto save failed");
    } finally {
      setAutoSaving(false);
    }
  }

  // === load profile on mount ===
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: ures } = await supabase.auth.getUser();
        const user = ures?.user || null;
        if (!user) throw new Error("Please sign in first.");
        setUid(user.id);

        const prof = await getMyProfile();
        const metaName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "User";

        if (!prof) {
          setName(metaName);
          setInitialName(metaName);
          setAvatar((prev) => prev ?? null);
          const metaSchool = (user.user_metadata?.school as string | undefined) || "School";
          setSchool(metaSchool);
          setTags({});
        } else {
          const finalName = prof.full_name || metaName || "User";
          setName(finalName);
          setInitialName(finalName);
          setAvatar(prof.avatar_url || null);
          const metaSchool =
            (prof as any).school ?? (user.user_metadata?.school as string | undefined) ?? "School";
          setSchool(metaSchool);
          const initTags: TagState = {};
          if ((prof as any).club) initTags.club = (prof as any).club;
          if ((prof as any).hobby) initTags.hobby = (prof as any).hobby;
          setTags(initTags);
        }

        localStorage.setItem("vlinks:name", (user.user_metadata?.full_name as string) || "User");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 初次與事件刷新 Likes/Bookmarks 計數
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [likes, bms] = await Promise.all([fetchMyLikedPosts(), fetchMyBookmarkedPosts()]);
        setLikeCount(likes.length);
        setBmCount(bms.length);
      } catch {
        /* ignore */
      }
    };
    loadCounts();
    const onRefresh = () => loadCounts();
    window.addEventListener("vlinks:refresh-like-bm", onRefresh);
    return () => window.removeEventListener("vlinks:refresh-like-bm", onRefresh);
  }, []);

  // ✅ 載入我發過的貼文
  useEffect(() => {
    let alive = true;
    const loadMine = async () => {
      setMyLoading(true);
      try {
        const rows = await fetchMyPosts();
        if (alive) setMyPosts(rows);
      } catch {
        if (alive) setMyPosts([]);
      } finally {
        if (alive) setMyLoading(false);
      }
    };
    loadMine();
    const onRefreshMine = () => loadMine();
    window.addEventListener("vlinks:refresh-my-posts", onRefreshMine);
    return () => {
      alive = false;
      window.removeEventListener("vlinks:refresh-my-posts", onRefreshMine);
    };
  }, []);

  // ✅ 打開清單 Modal
  async function openList(kind: "likes" | "bookmarks") {
    setListOpen(kind);
    setListLoading(true);
    try {
      const posts = kind === "likes" ? await fetchMyLikedPosts() : await fetchMyBookmarkedPosts();
      setListPosts(posts);
    } catch {
      setListPosts([]);
    } finally {
      setListLoading(false);
    }
  }

  // === save profile (name / avatar) ===
  const onSave = async () => {
    if (!uid) return;
    setSaving(true);
    setErr(null);
    setOk(false);
    try {
      const payload: any = {
        id: uid,
        full_name: (name || "").trim() || "User",
        avatar_url: avatar || null,
        updated_at: new Date().toISOString(),
      };

      await updateMyProfile(payload);

      try {
        await supabase.auth.updateUser({ data: { full_name: payload.full_name } });
      } catch {}

      setInitialName(payload.full_name);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // === sign out ===
  const handleSignOut = async () => {
    try {
      const confirmed = confirm("Sign out of VLinks?");
      if (!confirmed) return;
      await supabase.auth.signOut();
      onSignOut && onSignOut();
    } catch (e: any) {
      alert(e?.message || "Sign out failed");
    }
  };

  const dirty = (name || "").trim() !== (initialName || "").trim();

  // === render ===
  return (
    <div
      ref={pageRef}
      className="relative min-h-screen bg-gradient-to-b from-[#0b1325] via-[#0a162b] to-[#050a14] text-white px-4 pb-24"
      onClick={() => {
        setOpenTagKey(null);
        setSchoolOpen(false);
      }}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="grid place-items-center w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="tracking-[0.18em] text-white/90 font-semibold">VLINKS</div>
        <div className="w-4 h-4" aria-hidden />
      </div>

      {/* Profile card */}
      <section
        className={`relative rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4 shadow-lg overflow-visible ${
          anyMenuOpen ? "pb-12" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-white/10 grid place-items-center">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs text-white/60">No Avatar</div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pickFile();
              }}
              className="absolute -bottom-1 -right-1 grid place-items-center w-7 h-7 rounded-full bg-white text-black shadow"
              aria-label="Change avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-base font-semibold bg-transparent border-none outline-none"
                placeholder="Your name"
                disabled={loading || saving}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSecurity();
                }}
                className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition"
                aria-label="Open Security"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Location */}
            <div className="mt-1 text-xs text-white/70">📍 {city}</div>

            {/* Tags */}
            <div className="mt-2 flex gap-2 flex-wrap relative z-10">
              {TAG_GROUPS.map((g) => (
                <div key={g.key} className="relative">
                  <button
                    type="button"
                    ref={tagBtnRefs[g.key]}
                    onClick={(e) => {
                      e.stopPropagation();
                      openTag(g.key);
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition flex items-center gap-1
                      ${
                        tags[g.key]
                          ? "bg-white text-black border-white"
                          : "bg-white/10 text-white/70 border-white/20"
                      }`}
                  >
                    {g.label}: {tags[g.key] || "Select"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <MenuPortal anchorRect={openTagKey === g.key ? tagRect : null} open={openTagKey === g.key}>
                    {g.options.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectTag(g.key, opt);
                        }}
                        className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/10"
                      >
                        {opt}
                      </button>
                    ))}
                  </MenuPortal>
                </div>
              ))}
            </div>

            {/* School selector */}
            <div className="mt-3">
              <button
                type="button"
                ref={schoolBtnRef}
                onClick={toggleSchool}
                className="w-full h-10 px-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur flex items-center justify-between text-sm text-white/85"
                disabled={loading || saving}
              >
                {school === "School" ? "Select School" : school}
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>
              <MenuPortal anchorRect={schoolRect} open={schoolOpen}>
                {SCHOOLS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="w-full text-left px-3 py-2 rounded-lg text-white/90 hover:bg-white/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSchool(s);
                      setSchoolOpen(false);
                      debounce(() => autoSavePartial({ school: s }), 1000);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </MenuPortal>
              {/* Autosave feedback */}
              <div className="mt-2 min-h-[1rem]" aria-live="polite">
                {autoSaving && <span className="text-xs text-white/70">Saving…</span>}
                {!autoSaving && autoOk && <span className="text-xs text-emerald-300">Saved ✓</span>}
                {err && <span className="ml-2 text-xs text-red-400">{err}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Stats / Health（可點擊打開清單） */}
      <section className="mt-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-3 shadow-lg">
        <div className="grid grid-cols-3 gap-2 text-center">
          <button type="button" onClick={() => openList("bookmarks")} className="group w-full">
            <div className="text-lg font-semibold">{bmCount}</div>
            <div className="flex items-center justify-center gap-1 text-xs text-white/70">
              <Bookmark className="w-3 h-3" /> Bookmarks
            </div>
          </button>
          <button type="button" onClick={() => openList("likes")} className="group w-full">
            <div className="text-lg font-semibold">{likeCount}</div>
            <div className="flex items-center justify-center gap-1 text-xs text-white/70">
              <Heart className="w-3 h-3" /> Likes
            </div>
          </button>
          <button type="button" onClick={onOpenHealth} className="group w-full">
            <div className="mx-auto w-7 h-7 grid place-items-center rounded-full border border-white/35 bg-white/10 group-hover:bg-white/20 transition">
              <Brain className="w-4 h-4 text-white/90" />
            </div>
            <div className="mt-1 text-[11px] tracking-wide text-white/80">HEALTH QUIZ</div>
          </button>
        </div>
      </section>

      {/* ✅ My Post：實際列出我發過的貼文 */}
      <section className="mt-4 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-white/80">My Post</div>
          <div className="text-xs text-white/60">{myPosts.length}</div>
        </div>

        {myLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-white/10 border border-white/15 animate-pulse"
              />
            ))}
          </div>
        ) : myPosts.length === 0 ? (
          <div className="text-white/60 text-sm py-8 text-center">No posts yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {myPosts.map((p) => (
              <div key={p.id} className="relative h-28 rounded-xl border border-white/15 overflow-hidden">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 p-3">
                    <div className="text-[12px] text-white/80 line-clamp-4 whitespace-pre-wrap">
                      {p.title || p.content || "No content"}
                    </div>
                  </div>
                )}
                {/* 時間角標 */}
                <div className="absolute right-1 bottom-1 text-[10px] text-white/70 bg-black/40 rounded px-1.5 py-0.5">
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Save / Sign out */}
      <div className="mt-6">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={saving || !dirty}
          className={`w-full h-12 rounded-full font-medium flex items-center justify-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-60 ${
            dirty ? "bg-white text-black hover:bg-white/90" : "bg-white/60 text-black/70"
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : ok ? "Saved ✓" : "Save"}
        </button>
        <div className="mt-2 min-h-[1.25rem]" aria-live="polite" role="status">
          {err && <span className="text-red-400 text-sm">{err}</span>}
          {ok && !saving && <span className="text-emerald-300 text-sm">Saved!</span>}
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSignOut();
          }}
          className="w-full h-11 rounded-full border border-white/20 text-white/90 hover:bg-white/10 active:scale-95 transition"
        >
          Sign out
        </button>
      </div>

      {/* ✅ Likes / Bookmarks 清單 Modal */}
      {listOpen &&
        createPortal(
          <div className="fixed inset-0 z-[80]">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setListOpen(null)}
            />
            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[rgba(18,26,41,0.9)] backdrop-blur-2xl shadow-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-white/85">
                    {listOpen === "likes" ? "My Likes" : "My Bookmarks"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setListOpen(null)}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {listLoading ? (
                  <div className="text-white/70 text-sm py-6 text-center">Loading…</div>
                ) : listPosts.length === 0 ? (
                  <div className="text-white/60 text-sm py-6 text-center">No posts yet.</div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                    {listPosts.map((p) => (
                      <div key={p.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {p.profiles?.avatar_url ? (
                            <img
                              src={p.profiles.avatar_url}
                              className="w-6 h-6 rounded-full border border-white/20 object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/15 border border-white/20" />
                          )}
                          <div className="text-sm text-white/90">
                            {p.profiles?.full_name || "Unknown"}
                          </div>
                        </div>

                        {p.content && (
                          <div className="text-sm text-white/85 whitespace-pre-wrap">{p.content}</div>
                        )}

                        {/* 使用 image_url，避免 400 */}
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            className="mt-2 rounded-lg border border-white/10 max-h-48 object-cover w-full"
                            alt=""
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
