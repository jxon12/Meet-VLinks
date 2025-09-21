// src/components/Discover.tsx
import React, { useMemo, useState } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";

/* ---------- Types ---------- */
export type Buddy = {
  id: string;
  name: string;
  species?: string;
  avatar: string; // emoji is fine
};

export type Comment = {
  id: string;
  user: { name: string; avatar: string };
  text: string;
  ts: number;
};

export type Post = {
  id: string;
  author: Buddy;
  caption: string;
  imageUrl?: string;
  liked?: boolean;
  likes?: number;
  comments: Comment[];
  ts: number;
};

type Mood = "sunny" | "cloudy" | "night";

type Props = {
  mood: Mood;
  myName: string;
  myAvatar: string;
  knownBuddies: Buddy[];

  // Optional upstream managed feed
  posts?: Post[];
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;

  // Callbacks back to ChatPhone
  onAddBuddy?: (buddy: Buddy) => void;
  onOpenChat?: (buddy: Buddy) => void;
  onBuddyDM?: (buddy: Buddy, lines: string[]) => void;
  onUserComment?: (postId: string, text: string) => void;
};

/* ---------- Gen-Z helper lines (playful) ---------- */
const GENZ_REPLIES = [
  (u: string) => `LMAO ${u} you’re so real for this 😂`,
  (u: string) => `facts only, ${u}. no crumbs left. 🔥`,
  (u: string) => `ok but why is this kinda therapeutic??`,
  (u: string) => `ate and left no crumbs, ${u}. chef’s kiss 👩‍🍳✨`,
  (u: string) => `lowkey agree, highkey obsessed.`,
  (u: string) => `i felt this in my bones fr.`,
  (u: string) => `this x 1000. printing this on a tote.`,
  (u: string) => `sending you virtual sea-salt vibes 🌊`,
];

/* ---------- Local fallback posts (if parent not provided) ---------- */
function makeFallback(myName: string, myAvatar: string): Post[] {
  const now = Date.now();
  return [
    {
      id: "p1",
      author: { id: "skylar", name: "Skylar", species: "dumbo octopus", avatar: "🐙" },
      caption: "morning swim log — current was gentle, brain was louder. we made peace.",
      imageUrl: "", // no external asset; we’ll paint a gradient
      likes: 3,
      liked: false,
      comments: [
        { id: "c1", user: { name: "Louise", avatar: "🪼" }, text: "bookmarking this vibe.", ts: now - 1000 * 60 * 60 * 2 },
        { id: "c2", user: { name: "Joshua", avatar: "🐢" }, text: "who snuck serotonin in the tide?", ts: now - 1000 * 60 * 60 * 2 + 60000 },
      ],
      ts: now - 1000 * 60 * 60 * 3,
    },
    {
      id: "p2",
      author: { id: "luther", name: "Luther", species: "whale", avatar: "🐋" },
      caption: "today’s tiny joy: the exact 3.7s when sunlight hit the wave just right.",
      imageUrl: "",
      likes: 7,
      liked: true,
      comments: [
        { id: "c3", user: { name: "Skylar", avatar: "🐙" }, text: "ok poet. drop the playlist.", ts: now - 1000 * 60 * 30 },
        { id: "c4", user: { name: myName, avatar: myAvatar }, text: "need that 3.7s as a screensaver", ts: now - 1000 * 60 * 28 },
      ],
      ts: now - 1000 * 60 * 60 * 8,
    },
  ];
}

/* ---------- Small helpers ---------- */
const cls = (mood: Mood, base: string) =>
  `${base} ${mood === "night" ? "ocean-card" : "winter-card"}`;

const chip = (mood: Mood) => (mood === "night" ? "ocean-chip" : "winter-chip");

const avatarCls = (mood: Mood) =>
  mood === "night" ? "ocean-avatar" : "winter-avatar";

/* ---------- Component ---------- */
export default function Discover(props: Props) {
  const {
    mood,
    myName,
    myAvatar,
    knownBuddies,
    posts: postsProp,
    setPosts: setPostsProp,
    onAddBuddy,
    onOpenChat,
    onBuddyDM,
    onUserComment,
  } = props;

  // If parent provides posts/setPosts, use them; else maintain local feed.
  const [localPosts, setLocalPosts] = useState<Post[]>(() =>
    postsProp && postsProp.length ? postsProp : makeFallback(myName, myAvatar)
  );

  const posts = postsProp ?? localPosts;
  const setPosts = setPostsProp ?? setLocalPosts;

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: (p.likes || 0) + (p.liked ? -1 : 1),
            }
          : p
      )
    );
  };

  const handleComment = async (post: Post) => {
    const text = (drafts[post.id] || "").trim();
    if (!text) return;

    // Clear input
    setDrafts((d) => ({ ...d, [post.id]: "" }));

    // 1) upstream callback if provided
    if (onUserComment) {
      onUserComment(post.id, text);
    } else {
      // 2) local append
      const ts = Date.now();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  { id: String(ts), user: { name: myName, avatar: myAvatar }, text, ts },
                ],
              }
            : p
        )
      );

      // playful “crowd reply” from other buddies to make thread lively
      const others = knownBuddies.filter((b) => b.id !== post.author.id);
      const replyBuddy = others[Math.floor(Math.random() * others.length)] || post.author;
      const lineGen = GENZ_REPLIES[Math.floor(Math.random() * GENZ_REPLIES.length)];
      const line = lineGen(myName);

      // public thread add
      setTimeout(() => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    {
                      id: String(Date.now()),
                      user: { name: replyBuddy.name, avatar: replyBuddy.avatar },
                      text: line,
                      ts: Date.now(),
                    },
                  ],
                }
              : p
          )
        );
      }, 500 + Math.random() * 700);

      // private DM invite via callback
      if (onBuddyDM) {
        setTimeout(() => {
          onBuddyDM(post.author, [
            `hey ${myName}, saw your comment — want to chat more here?`,
            `also… ${text.length <= 18 ? text : text.slice(0, 18) + "…"} kinda lived in my head rent-free 😂`,
          ]);
        }, 600);
      }
    }
  };

  const shell = useMemo(
    () => ({
      card: mood === "night" ? "ocean-card" : "winter-card",
      pill: mood === "night" ? "ocean-chip" : "winter-chip",
      input:
        mood === "night"
          ? "ocean-inputfield"
          : "winter-textfield",
    }),
    [mood]
  );

  return (
    <div className="p-3 space-y-3">
      {/* Suggested follows */}
      <div className={cls(mood, "rounded-2xl p-3")}>
        <div className="text-[13px] font-medium mb-2">People you may like</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {knownBuddies.map((b) => (
            <div
              key={b.id}
              className={cls(mood, "min-w-[180px] rounded-xl p-3 flex items-center gap-3")}
            >
              <div className={`w-10 h-10 grid place-items-center rounded-full text-xl ${avatarCls(mood)}`}>
                {b.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">
                  <button
                    onClick={() => onOpenChat?.(b)}
                    className="hover:underline"
                    title={`Open chat with ${b.name}`}
                  >
                    {b.name}
                  </button>{" "}
                  <span className="text-[11px] opacity-60">
                    · {b.species || "buddy"}
                  </span>
                </div>
                <button
                  onClick={() => onAddBuddy?.(b)}
                  className={`${chip(mood)} text-[12px] mt-1 inline-flex items-center gap-1`}
                >
                  <Plus className="w-3 h-3" /> Follow
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className={cls(mood, "rounded-2xl p-3")}>
            {/* header */}
            <div className="flex items-center gap-3 mb-2">
              <button
                className={`w-10 h-10 grid place-items-center rounded-full text-xl ${avatarCls(mood)}`}
                onClick={() => onOpenChat?.(p.author)}
                title={`Open chat with ${p.author.name}`}
              >
                {p.author.avatar}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">
                  <button
                    onClick={() => onOpenChat?.(p.author)}
                    className="hover:underline"
                  >
                    {p.author.name}
                  </button>{" "}
                  <span className="text-[11px] opacity-60">· {p.author.species || "buddy"}</span>
                </div>
                <div className="text-[11px] opacity-60">
                  {new Date(p.ts).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            {/* caption */}
            <div className="text-[14px] leading-relaxed mb-2">{p.caption}</div>

            {/* image (gradient placeholder if none) */}
            <div
              className="w-full rounded-xl overflow-hidden mb-2"
              style={{
                aspectRatio: "16/9",
                background:
                  p.imageUrl
                    ? `center / cover no-repeat url(${p.imageUrl})`
                    : "linear-gradient(135deg, rgba(160,210,200,0.35), rgba(120,170,255,0.35))",
              }}
              aria-label="post image"
            />

            {/* actions */}
            <div className="flex items-center gap-3 text-[13px] mb-2">
              <button
                onClick={() => handleLike(p.id)}
                className={`${chip(mood)} inline-flex items-center gap-1`}
                title="Like"
              >
                <Heart className="w-4 h-4" />
                {p.liked ? "Liked" : "Like"} · {p.likes ?? 0}
              </button>
              <div className="opacity-70 inline-flex items-center gap-1">
                <MessageCircle className="w-4 h-4" /> {p.comments.length}
              </div>
            </div>

            {/* comments */}
            <div className="space-y-2">
              {p.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className={`w-7 h-7 grid place-items-center rounded-full text-base ${avatarCls(mood)}`}>
                    {c.user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px]">
                      <span className="font-medium">{c.user.name}</span>{" "}
                      <span className="opacity-80">{c.text}</span>
                    </div>
                    <div className="text-[11px] opacity-50">
                      {new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* add comment */}
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-7 h-7 grid place-items-center rounded-full text-base ${avatarCls(mood)}`}>
                {myAvatar}
              </div>
              <input
                value={drafts[p.id] || ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleComment(p)}
                placeholder="Add a comment…"
                className={`flex-1 h-9 px-3 text-[13px] ${shell.input}`}
              />
              <button
                onClick={() => handleComment(p)}
                className={`${chip(mood)} px-3 h-9 text-[13px]`}
              >
                Send
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
