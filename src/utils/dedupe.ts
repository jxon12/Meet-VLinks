// 唯一键：id 优先；否则用 authorId+title+firstImage 生成指纹
export type Post = {
  id?: string | number;
  authorId: string;
  title: string;
  body?: string;
  images?: string[];
  tag?: string;
  color?: string;
  createdAt?: number;
};

const keyOf = (p: Post) =>
  (p.id ?? "") +
  "|" +
  p.authorId +
  "|" +
  (p.title?.trim() ?? "") +
  "|" +
  (p.images?.[0] ?? "");

export function dedupePosts(list: Post[]): Post[] {
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const p of list) {
    const k = keyOf(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  // 最新的在前
  out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return out;
}
