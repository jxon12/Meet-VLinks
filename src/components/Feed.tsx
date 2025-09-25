import React, { useEffect, useMemo, useState } from "react";
import {
  fetchFeed,
  toggleLike as apiToggleLike,
  toggleSave as apiToggleSave,
  updatePost,
  deletePost,
  type DBPost,
} from "../api/posts";
import {
  ChevronLeft,
  Heart,
  Bookmark,
  Plus,
  Home,
  Compass,
  BookMarked,
  UserRound,
  MessageCircle,
  Calendar,
  Languages,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import BackgroundOcean from "./BackgroundOcean";
import EditPostDialog from "./EditPostDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import ReportPostDialog from "./ReportPostDialog";
import { supabase } from "../lib/supabaseClient";
import { useTranslator } from "../hooks/useTranslator";

/* ---------- Props ---------- */
type FeedProps = {
  school: string;
  onBack: () => void;
  onOpenPersonal: () => void;
  onOpenProfile: (userId: string) => void; // open another user's profile
  avatar: string | null;
  signedUp?: boolean;
  onOpenPostModal?: () => void;
  onOpenAI?: () => void;
  onOpenTodo?: () => void;
  onOpenLobby?: () => void;
};

/* ---------- Fallback when API fails ---------- */
const FALLBACK: DBPost[] = [];

/* ---------- Utils ---------- */
const timeAgo = (iso: string) => {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
};

/* ---------- PostCard ---------- */
function PostCard({
  p,
  liked,
  saved,
  onLike,
  onSave,
  onOpenProfile,
  isOwner,
  onRequestEdit,
  onRequestDelete,
  onRequestReport,
}: {
  p: DBPost;
  liked?: boolean;
  saved?: boolean;
  onLike: () => void;
  onSave: () => void;
  onOpenProfile?: (userId: string) => void;
  isOwner: boolean;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
  onRequestReport: () => void;
}) {
  const { translate, loading } = useTranslator();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [meta, setMeta] = useState<{ from?: string; to?: string }>();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function onTranslateClick() {
    if (!p.content) return;
    if (translated) return setShowTranslated((v) => !v);
    try {
      const res = await translate(p.content);
      setTranslated(res.text);
      setMeta({ from: res.langFrom, to: res.langTo });
      setShowTranslated(true);
    } catch {
      alert("Translate failed, try again later.");
    }
  }

  const when = timeAgo(p.created_at);
  const authorLetter = (p.author_name ?? "?").slice(0, 1);

  return (
    <article className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl transition hover:border-white/20 hover:shadow-[0_10px_40px_rgba(20,40,80,0.28)] ring-1 ring-white/10">
      {/* header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          className="flex items-center gap-3 group"
          onClick={() => {
            if (!p.author_id) return;
            onOpenProfile?.(p.author_id);
          }}
          title={p.author_name || ""}
        >
          {p.author_avatar ? (
            <img
              src={p.author_avatar}
              alt={p.author_name || ""}
              className="w-10 h-10 rounded-full border border-white/20 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 grid place-items-center text-sm">
              {authorLetter}
            </div>
          )}
          <div className="text-left leading-tight">
            <div className="text-white/95 font-semibold group-hover:underline underline-offset-4 decoration-white/30">
              {p.author_name ?? "Unknown"}
            </div>
            <div className="text-[11px] text-white/55 tabular-nums">{when}</div>
          </div>
        </button>

        {/* top-right: menu button */}
        <div className="relative">
          <button
            aria-label="more"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 rounded-full hover:bg-white/10"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/15 bg-black/70 backdrop-blur-xl p-1 shadow-2xl z-20">
              {isOwner ? (
                <>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestEdit();
                    }}
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-red-300"
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestDelete();
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </>
              ) : (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestReport();
                  }}
                >
                  <Flag className="w-4 h-4" /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* image */}
      {p.image_url && (
        <div className="mx-4 rounded-2xl overflow-hidden border border-white/10">
          <img
            src={p.image_url}
            alt={p.title || "post image"}
            className="w-full aspect-[4/5] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* body */}
      <div className="px-4 py-4">
        {p.title && <h3 className="mt-1 font-semibold text-white/95">{p.title}</h3>}

        {p.content && (
          <>
            <p
              className={`mt-1 whitespace-pre-wrap leading-relaxed text-white/90 ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {showTranslated && translated ? translated : p.content}
            </p>

            {/* translate + show more row */}
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={onTranslateClick}
                className="px-2.5 py-1.5 rounded-full text-xs border border-white/15 bg-white/10 backdrop-blur hover:bg-white/20 transition inline-flex items-center gap-1"
                title="Translate"
              >
                <Languages className="w-3.5 h-3.5" />
                {loading ? "Translating…" : translated && showTranslated ? "Original" : "Translate"}
              </button>

              {p.content.length > 120 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[12px] text-white/70 hover:text-white underline underline-offset-2"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {showTranslated && translated && (
              <div className="mt-1 text-[11px] text-white/45">
                Auto-translated{meta?.from ? ` from ${meta.from}` : ""} → {meta?.to?.toUpperCase()}
              </div>
            )}
          </>
        )}

        {/* actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLike();
                const el = document.getElementById(`like-${p.id}`);
                el?.classList.remove("like-burst");
                void el?.offsetWidth;
                el?.classList.add("like-burst");
              }}
              id={`like-${p.id}`}
              className="rounded-full bg-black/35 border border-white/20 p-2 backdrop-blur active:scale-95 transition relative like-burst-dot"
              title="Like"
              aria-pressed={!!liked}
            >
              <Heart className={`w-[18px] h-[18px] ${liked ? "fill-white text-white" : "text-white/70"}`} />
            </button>

            <button
              onClick={onSave}
              className="rounded-full bg-black/35 border border-white/20 p-2 backdrop-blur active:scale-95 transition"
              title="Save"
              aria-pressed={!!saved}
            >
              <Bookmark className={`w-[18px] h-[18px] ${saved ? "fill-white text-white" : "text-white/70"}`} />
            </button>
          </div>

          <div className="text-[12px] text-white/50">{when}</div>
        </div>
      </div>
    </article>
  );
}

/* ---------- main component ---------- */
export default function Feed({
  school,
  onBack,
  onOpenPersonal,
  onOpenProfile,
  onOpenTodo,
  avatar,
  signedUp = true,
  onOpenPostModal,
  onOpenAI,
  onOpenLobby,
}: FeedProps) {
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionUid, setSessionUid] = useState<string | null>(null);

  // dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activePost, setActivePost] = useState<DBPost | null>(null);

  // session id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUid(data.user?.id ?? null));
  }, []);

  // fetch
  const refresh = async () => {
    setLoading(true);
    try {
      const list = await fetchFeed();
      setPosts(list && list.length ? list : FALLBACK);

      const initLiked: Record<string, boolean> = {};
      const initSaved: Record<string, boolean> = {};
      (list || []).forEach((p) => {
        if (p.liked != null) initLiked[p.id] = !!p.liked;
        if (p.saved != null) initSaved[p.id] = !!p.saved;
      });
      setLiked(initLiked);
      setSaved(initSaved);
    } catch {
      setPosts(FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // 監聽外部要求刷新（例如 PostComposer 完成發文後）
  useEffect(() => {
    const onExternalRefresh = () => refresh();
    window.addEventListener("vlinks:refresh-feed", onExternalRefresh);
    return () => window.removeEventListener("vlinks:refresh-feed", onExternalRefresh);
  }, []);

  // filter
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const haystack = `${p.author_name ?? ""} ${p.title ?? ""} ${p.content ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, searchTerm]);

  // like/save
  const doToggleLike = async (id: string) => {
    const next = !(liked[id] ?? false);
    setLiked((m) => ({ ...m, [id]: next }));
    try {
      await apiToggleLike(id, next);
      // 通知 Account 重新抓我的 likes/bookmarks
      window.dispatchEvent(new Event("vlinks:refresh-like-bm"));
    } catch {
      setLiked((m) => ({ ...m, [id]: !next }));
    }
  };

  const doToggleSave = async (id: string) => {
    const next = !(saved[id] ?? false);
    setSaved((m) => ({ ...m, [id]: next }));
    try {
      await apiToggleSave(id, next);
      // 通知 Account 重新抓我的 likes/bookmarks
      window.dispatchEvent(new Event("vlinks:refresh-like-bm"));
    } catch {
      setSaved((m) => ({ ...m, [id]: !next }));
    }
  };

  return (
    <div className="relative min-h-screen text-white">
      <BackgroundOcean />

      {/* top bar */}
      <div className="sticky top-0 z-30 h-14 px-4 flex items-center justify-between backdrop-blur-md bg-black/25 border-b border-white/10">
        <button
          onClick={onBack}
          className="rounded-full px-3 py-1.5 border border-white/20 bg-white/5 active:scale-95 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="tracking-[0.18em] font-semibold">VLINKS</div>
        <button
          onClick={() => onOpenAI?.()}
          className="rounded-full p-2 border border-white/20 bg-white/5 active:scale-95 transition"
          aria-label="AI"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* welcome */}
      <div className="pt-6 pb-2 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/90">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-blue-200 to-cyan-300 bg-clip-text text-transparent">
            Mindful Feed
          </span>
        </h1>
        <p className="mt-2 text-sm text-white/60">Stay calm • focus • connect</p>
      </div>

      {/* search */}
      <div className="px-4 mt-3 sm:mt-5">
        <div className="relative max-w-md mx-auto">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search posts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-full bg-white/10 border border-white/20 backdrop-blur text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition"
          />
        </div>
      </div>

      {/* list */}
      <div className="px-4 pb-40 mt-4 max-w-xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center text-white/60 py-10">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-white/60 py-10">No posts found</div>
        ) : (
          filtered.map((p) => {
            const isOwner = sessionUid === p.author_id;
            return (
              <div key={p.id} id={`post-${p.id}`}>
                <PostCard
                  p={p}
                  liked={liked[p.id] ?? !!p.liked}
                  saved={saved[p.id] ?? !!p.saved}
                  onLike={() => doToggleLike(p.id)}
                  onSave={() => doToggleSave(p.id)}
                  onOpenProfile={onOpenProfile}
                  isOwner={!!isOwner}
                  onRequestEdit={() => { setActivePost(p); setEditOpen(true); }}
                  onRequestDelete={() => { setActivePost(p); setDeleteOpen(true); }}
                  onRequestReport={() => { setActivePost(p); setReportOpen(true); }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* floating calendar */}
      {signedUp && (
        <button
          onClick={onOpenPersonal}
          className="fixed right-4 bottom-40 grid place-items-center w-12 h-12 rounded-xl border border-white/20 bg-white/10 backdrop-blur shadow-lg active:scale-95 transition"
          title="Calendar"
        >
          <Calendar className="w-5 h-5" />
        </button>
      )}

      {/* bottom nav */}
      <nav className="fixed left-0 right-0 z-40 bottom-16 md:bottom-6">
        <div className="mx-auto max-w-md px-3">
          <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl shadow-lg">
            <div className="h-16 grid grid-cols-5 place-items-center text-white/80">
              <button onClick={onBack} className="flex flex-col items-center gap-1 hover:text-white transition" aria-label="Home">
                <Home className="w-5 h-5" />
                <span className="text-[11px] leading-none">Home</span>
              </button>

              <button onClick={onOpenLobby} className="flex flex-col items-center gap-1 hover:text-white transition" aria-label="Lobby">
                <Compass className="w-5 h-5" />
                <span className="text-[11px] leading-none">Lobby</span>
              </button>

              <div className="relative -mt-6">
                <button
                  onClick={onOpenPostModal}
                  className="grid place-items-center w-14 h-14 rounded-full border border-white/20 bg-white/80 text-black shadow-lg active:scale-95 transition"
                  aria-label="Create"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <div className="text-center mt-1 text-[11px] text-white/80 leading-none">Post</div>
              </div>

              <button onClick={onOpenTodo} className="flex flex-col items-center gap-1 hover:text-white transition" aria-label="To-Do">
                <BookMarked className="w-5 h-5" />
                <span className="text-[11px] leading-none">To-Do</span>
              </button>

              <button
                onClick={() => {
                  if (!sessionUid) return;
                  onOpenProfile(sessionUid);
                }}
                className="flex flex-col items-center gap-1 hover:text-white transition"
                aria-label="My Account"
              >
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border border-white/20" />
                ) : (
                  <UserRound className="w-6 h-6" />
                )}
                <span className="text-[11px] leading-none">Me</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* like spark styles */}
      <style>{`
        .like-burst { animation: likePop .28s ease-out; }
        .like-burst-dot::after{
          content:""; position:absolute; inset:0; margin:auto; width:2px; height:2px; border-radius:9999px;
          background: white; box-shadow:
            0 -12px 0 0 white, 0 12px 0 0 white, -12px 0 0 0 white, 12px 0 0 0 white,
            8px 8px 0 0 white, -8px 8px 0 0 white, 8px -8px 0 0 white, -8px -8px 0 0 white;
          opacity:0;
        }
        .like-burst.like-burst-dot::after{ opacity:1; animation: spark .32s ease-out; }
        @keyframes likePop { 0%{ transform:scale(.9)} 60%{ transform:scale(1.12)} 100%{ transform:scale(1)} }
        @keyframes spark { from{ transform: scale(.6); opacity:.9 } to{ transform: scale(1.6); opacity:0 } }
      `}</style>

      {/* dialogs */}
      <EditPostDialog
        open={editOpen}
        initialTitle={activePost?.title ?? ""}
        initialContent={activePost?.content ?? ""}
        onClose={() => setEditOpen(false)}
        onSubmit={async (title, content) => {
          if (!activePost) return;
          await updatePost(activePost.id, { title, content });
          setEditOpen(false);
          await refresh();
        }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!activePost) return;
          await deletePost(activePost.id);
          setDeleteOpen(false);
          await refresh();
        }}
      />

      <ReportPostDialog
        open={reportOpen}
        postId={activePost?.id || ""}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => {
          setReportOpen(false);
        }}
      />
    </div>
  );
}
