// api/ai.ts  —— 运行在服务端（Bolt/Blot 会把 /api/* 当作函数）
// 需要在项目环境变量里配置：OPENAI_API_KEY

export const config = { runtime: "edge" }; // 若你的平台支持 Edge；不支持就删掉这行

type Req = {
  action: "compose" | "tags" | "moderate";
  topic?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  tags?: string[];
  school?: string;
  text?: string;
};

export default async function handler(req: Request) {
  try {
    const body = (await req.json()) as Req;
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    // —— 选择一个你有权限的模型（gpt-4o-mini/ o4-mini 等）
    const model = "gpt-4o-mini";

    if (body.action === "moderate") {
      // 这里用一个简易的 Prompt 审核，你也可以换官方 Moderation API
      const prompt = `You are a strict content policy checker. Given the text, reply ONLY with JSON: {"ok": true|false, "reason": "..."}.
Text:\n${body.text ?? ""}`;
      const { choices } = await callOpenAI(key, model, prompt);
      const json = safeJson(choices?.[0]?.message?.content) ?? { ok: true };
      return jsonRes(json);
    }

    if (body.action === "tags") {
      const prompt = `
Return 3-6 concise tags in JSON array for the text. Only lowercase single words. Example: ["focus","breath","sleep"].
Text:\n${body.text ?? ""}`;
      const { choices } = await callOpenAI(key, model, prompt);
      const arr = safeJson(choices?.[0]?.message?.content) ?? [];
      return jsonRes({ tags: arr });
    }

    if (body.action === "compose") {
      const tone = body.tone ?? "calm";
      const length = body.length ?? "short";
      const guide = length === "short" ? "≈40-80 chars" : length === "medium" ? "≈80-140 chars" : "≈140-220 chars";
      const prompt = `
Write one friendly post for a student feed. Style iOS 16 glassy vibe; gentle, inclusive, ${tone} tone; ${guide}.
Use short sentences and some whitespace. Avoid emojis, hashtags. If topic is vague, give a helpful micro-practice.

Context:
- topic: ${body.topic}
- school: ${body.school ?? "N/A"}
- existing tags: ${body.tags?.join(", ") || "none"}

Return JSON: {"text": "...", "suggestedTags": ["...","..."]}`;
      const { choices } = await callOpenAI(key, model, prompt);
      const out = safeJson(choices?.[0]?.message?.content) ?? { text: "" };
      // 简易再审一遍
      const mod = await quickModerate(key, model, out.text || "");
      return jsonRes({ ...out, blocked: !mod.ok, reason: mod.reason });
    }

    return new Response("Bad action", { status: 400 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 });
  }
}

function jsonRes(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeJson(s: string | undefined) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

async function callOpenAI(key: string, model: string, prompt: string) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: "You are a helpful assistant." },
                 { role: "user", content: prompt }],
      temperature: 0.7
    })
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status} ${await r.text()}`);
  return r.json();
}

async function quickModerate(key: string, model: string, text: string) {
  const prompt = `Check if the following text is safe for a student community. 
Return ONLY JSON: {"ok": true|false, "reason": "..."}.
Text:\n${text}`;
  const { choices } = await callOpenAI(key, model, prompt);
  return safeJson(choices?.[0]?.message?.content) ?? { ok: true };
}
