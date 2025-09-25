// src/components/Moments.tsx
import React, { useMemo, useRef, useState } from "react";

export type Buddy = {
  id: string;
  name: string;
  species: string;
  avatar: string; // emoji
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

type Props = {
  mood: "sunny" | "cloudy" | "night";
  myName: string;
  myAvatar: string;
  knownBuddies: Buddy[];
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;

  onAddBuddy: (b: Buddy) => void;
  onOpenChat: (b: Buddy) => void;

  // 用户发评论时，上层会：
  // 1) 落本地评论
  // 2) 调 AI 生成作者的公共回复
  // 3) 给用户发作者的 DM（进入 chat）
  onUserComment: (postId: string, commentText: string, author: Buddy) => void;

  onToggleLike: (postId: string) => void;
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h/24);
  return `${d}d`;
}

// 一些 Gen-Z / 热闹“路人”评论（从已知好友里随机挑角色说话）
const RANDO_LINES = [
  "谁在背刺我的周末计划😤",
  "哈哈哈懂你，这 vibe 太对了",
  "给整笑了，太真实了吧",
  "留给我一口乐子谢谢🙏",
  "这张图我能当壁纸了吧？",
  "我宣布：今天摆烂也算高效管理",
  "冲一杯冰美式，这事就解决 80% 了",
  "这条我先转到我小号👏",
  "救命我已经在路上了",
  "这条会火 trust",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const InputBar: React.FC<{
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  mood: Props["mood"];
}> = ({ value, onChange, onSubmit, mood }) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="写点啥…"
        className={`flex-1 h-9 px-3 text-[13px] ${mood==='night' ? 'ocean-inputfield' : 'winter-textfield'}`}
      />
      <button onClick={onSubmit} className="px-3 h-9 rounded-lg winter-button text-[13px]">发送</button>
    </div>
  );
};

const Moments: React.FC<Props> = ({
  mood, myName, myAvatar, knownBuddies,
  posts, setPosts, onAddBuddy, onOpenChat,
  onUserComment, onToggleLike,
}) => {
  const [draft, setDraft] = useState<Record<string,string>>({});
  const pendingRef = useRef<Record<string,boolean>>({});

  // 提交评论：先本地，再交给上层触发 AI 公共回复 + DM
  const submitComment = (post: Post) => {
    const text = (draft[post.id] || "").trim();
    if (!text || pendingRef.current[post.id]) return;
    pendingRef.current[post.id] = true;

    // 上层会负责把“我的评论”写入 posts，并补作者的公共回复和 DM
    onUserComment(post.id, text, post.author);

    // 让评论区更热闹：随机 0~2 条“路人好友”评论插一嘴（选不同 buddy）
    const extraCount = Math.random() < 0.65 ? (Math.random() < 0.5 ? 1 : 2) : 0;
    if (extraCount) {
      const pool = knownBuddies.filter(b => b.id !== post.author.id);
      const ids = new Set<string>();
      while (ids.size < Math.min(extraCount, pool.length)) ids.add(pick(pool).id);
      const extras = Array.from(ids).map((bid, i) => {
        const buddy = pool.find(b => b.id === bid)!;
        return {
          id: `${Date.now()}_r${i}`,
          user: { name: buddy.name, avatar: buddy.avatar },
          text: pick(RANDO_LINES),
          ts: Date.now() + i + 1,
        } as Comment;
      });
      setTimeout(() => {
        setPosts(prev => prev.map(p =>
          p.id === post.id ? { ...p, comments: [...p.comments, ...extras] } : p
        ));
      }, 300 + Math.random()*400);
    }

    // 清空输入框
    setDraft(d => ({ ...d, [post.id]: "" }));
    // 稍后解除 pending
    setTimeout(() => { pendingRef.current[post.id] = false; }, 800);
  };

  return (
    <div className="p-3 space-y-3">
      {posts.map((post)=>(
        <div key={post.id} className={`rounded-2xl p-0 overflow-hidden ${mood==='night' ? 'ocean-card' : 'winter-card'}`}>
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className={`w-9 h-9 grid place-items-center rounded-full text-lg ${mood==='night' ? 'ocean-avatar' : 'winter-avatar'}`}>{post.author.avatar}</div>
            <div className="flex-1">
              <div className="text-[13px] font-medium leading-tight">{post.author.name} <span className="opacity-60 text-[11px]">· {post.author.species}</span></div>
              <div className="text-[11px] opacity-60">{timeAgo(post.ts)} ago</div>
            </div>
            <div className="flex gap-2">
              <button className={`px-2 py-1 rounded-lg ${mood==='night' ? 'ocean-chip' : 'winter-chip'}`} onClick={()=>onAddBuddy(post.author)}>关注</button>
              <button className={`px-2 py-1 rounded-lg ${mood==='night' ? 'ocean-chip' : 'winter-chip'}`} onClick={()=>onOpenChat(post.author)}>私信</button>
            </div>
          </div>

          {/* Image */}
          {post.imageUrl && (
            <div className="w-full aspect-[4/3] bg-black/5 overflow-hidden">
              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Caption */}
          <div className="px-3 py-2 text-[14px] leading-relaxed">{post.caption}</div>

          {/* Actions */}
          <div className="px-3 pb-2 flex items-center gap-4 text-[13px]">
            <button onClick={()=>onToggleLike(post.id)} className="flex items-center gap-1">
              <span>{post.liked ? "❤️" : "🤍"}</span>
              <span>{post.likes || 0}</span>
            </button>
            <div className="opacity-60">{post.comments.length} comments</div>
          </div>

          {/* Comments */}
          <div className="px-3 pb-3 space-y-2">
            {post.comments.slice(-10).map(c => (
              <div key={c.id} className={`flex items-start gap-2 rounded-lg p-2 ${mood==='night' ? 'ocean-block' : 'winter-block'}`}>
                <div className={`w-7 h-7 grid place-items-center rounded-full text-base ${mood==='night' ? 'ocean-avatar' : 'winter-avatar'}`}>{c.user.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px]"><span className="font-medium">{c.user.name}</span> <span className="opacity-60 text-[11px]">· {timeAgo(c.ts)}</span></div>
                  <div className="text-[13px] leading-snug break-words">{c.text}</div>
                </div>
              </div>
            ))}

            {/* Input */}
            <InputBar
              value={draft[post.id] || ""}
              onChange={(v)=>setDraft(d=>({...d, [post.id]: v}))}
              onSubmit={()=>submitComment(post)}
              mood={mood}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Moments;
