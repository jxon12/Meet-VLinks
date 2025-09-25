// api/rooms/ocean-office/count.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // ⚡ Step 1: 把 spaceId 换成你的
    // 注意 ⚠️ 这里的 "\" 要写成双斜杠 "\\"，再 encodeURIComponent
    const spaceId = encodeURIComponent("ZLndOHcI6fhqVTMc\\links");

    // ⚡ Step 2: API 调用，API Key 从环境变量里拿
    // 你需要在 .env 里加：
    // GATHER_API_KEY=你的暗号key
    const r = await fetch(
      `https://api.gather.town/api/v2/spaces/${spaceId}/members`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GATHER_API_KEY}`, // 🔑 这里用环境变量
        },
      }
    );

    if (!r.ok) {
      const error = await r.text();
      return res.status(r.status).json({ error });
    }

    const data = await r.json();

    // ⚡ Step 3: 返回人数给前端
    res.status(200).json({ count: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
