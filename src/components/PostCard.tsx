import React, { useState } from "react";
import { Heart, Bookmark, Languages } from "lucide-react";
import { useTranslator } from "../hooks/useTranslator"; // 引入我们之前写的 hook

type Post = {
  id: string;
  image: string;
  title?: string;
  text?: string; // ✅ 新增正文内容
};

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // 翻译逻辑
  const { translate, loading } = useTranslator();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  async function onTranslateClick() {
    if (!post.text) return;
    if (translated) {
      // 已经有翻译 → 切换显示
      setShowTranslated(v => !v);
      return;
    }
    try {
      const res = await translate(post.text); // 自动翻译到系统语言
      setTranslated(res.text);
      setShowTranslated(true);
    } catch {
      alert("Translate temporarily unavailable.");
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10
                 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]
                 hover:scale-[1.01] transition"
    >
      {/* 图像 */}
      <img
        src={post.image}
        alt={post.title || "post"}
        className="w-full h-48 object-cover"
        draggable={false}
      />

      {/* 顶部右侧操作 */}
      <div className="absolute top-2 right-2 flex gap-2">
        {/* 收藏 */}
        <button
          onClick={() => setSaved(v => !v)}
          className="h-9 w-9 grid place-items-center rounded-full bg-black/40 backdrop-blur
                     border border-white/20 hover:bg-black/50 transition"
        >
          <Bookmark
            className={`w-5 h-5 ${saved ? "fill-white text-white" : "text-white/80"}`}
          />
        </button>
      </div>

      {/* 底部栏 */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/85 truncate">{post.title || "Untitled"}</div>
          {/* 点赞 */}
          <button
            onClick={() => setLiked(v => !v)}
            className="h-9 w-9 grid place-items-center rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            <Heart
              className={`w-5 h-5 ${liked ? "fill-rose-400 text-rose-400" : "text-white/80"}`}
            />
          </button>
        </div>

        {/* 正文 + 翻译 */}
        {post.text && (
          <div className="text-sm text-white/80 leading-relaxed">
            {showTranslated && translated ? translated : post.text}
          </div>
        )}

        {post.text && (
          <button
            onClick={onTranslateClick}
            disabled={loading}
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-200 hover:text-blue-100 transition"
          >
            <Languages className="w-3.5 h-3.5" />
            {loading ? "Translating…" : translated && showTranslated ? "Show original" : "Translate"}
          </button>
        )}
      </div>
    </div>
  );
}
