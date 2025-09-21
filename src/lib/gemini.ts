// src/lib/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export type BuddyId = "skylar" | "louise" | "luther" | "Joshua";
export type HistoryItem = { role: "user" | "model"; parts: { text: string }[] };
export type BuddyInfo = {
  id?: BuddyId;
  name?: string;
  species?: string;
  persona?: string;
  safetyHint?: string;
  history?: HistoryItem[];
};

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// 友好提醒（不阻断运行），避免 key 丢了时你不知道原因
if (!API_KEY) {
  console.warn(
    "[gemini] Missing VITE_GEMINI_API_KEY in your environment. " +
      "Create .env and set: VITE_GEMINI_API_KEY=your_key_here"
  );
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 你也可以换成 "gemini-1.5-pro"（更强，但稍慢）
const MODEL_NAME = "gemini-1.5-flash";

function buildSystemPrompt(buddy?: BuddyInfo) {
  const persona =
    buddy?.persona ??
    "Kind, supportive, concise. Student-friendly, no medical or clinical claims.";
  const name = buddy?.name ?? "Buddy";
  const safety =
    buddy?.safetyHint ??
    "Never provide harmful instructions. If user shows self-harm risk, encourage reaching out to hotlines and trusted people.";

  // 用分段明确角色语气，避免跑题
  return [
    `You are ${name}. Persona: ${persona}.`,
    `Style: short, warm, concrete. Use gentle language. Avoid clinical terms.`,
    `Safety: ${safety}.`,
    `IMPORTANT: Split your full reply into 2-3 SHORT chat-sized messages. Return them as plain text joined by "\n\n---\n\n" (use exactly three dashes between messages).`,
  ].join("\n");
}

function asHistory(buddy?: BuddyInfo) {
  // Gemini expects: Array<{role, parts:[{text}]}>, 你已在 ChatPhone 侧按这个结构传了
  return Array.isArray(buddy?.history) ? buddy!.history! : [];
}

/**
 * askGeminiMulti
 * @param userPrompt 你在 ChatPhone.tsx 传入的拼接 prompt
 * @param buddy 可选：角色、history
 * @param opts.chunks 期望切成几段（2~3）
 * @returns string[] （每一项是一条要发的消息）
 */
export async function askGeminiMulti(
  userPrompt: string,
  buddy?: BuddyInfo,
  opts?: { chunks?: number }
): Promise<string[]> {
  if (!genAI) {
    // 没有 key 时给一个兜底
    return [
      "I’m here with you. (Gemini API key not set).",
      "Add VITE_GEMINI_API_KEY in your .env to enable AI replies.",
    ];
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const system = buildSystemPrompt(buddy);
  const hist = asHistory(buddy);

  // 我们把“系统指令/角色描述”放在会话开头，再接用户 prompt
  const contents = [
    { role: "user", parts: [{ text: system }] },
    ...hist,
    { role: "user", parts: [{ text: userPrompt }] },
  ];

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.9,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 512,
    },
    safetySettings: [
      // 你可以在这里追加更严格的安全阈值
    ],
  });

  const text = result?.response?.text?.() ?? "";
  const raw = text.trim();

  if (!raw) return [];

  // 让模型用分隔符“---”分段；如果模型没听话，就做个兜底切分
  let parts = raw.split(/\n?\s*---\s*\n?/g).map((s) => s.trim()).filter(Boolean);

  // 限制段数 2–3（你也可用 opts 控制）
  const want = Math.min(Math.max(opts?.chunks ?? 3, 2), 3);
  if (parts.length > want) parts = parts.slice(0, want);
  if (parts.length < 2) {
    // 兜底：按句号粗暴拆两段
    const half = Math.ceil(raw.length / 2);
    parts = [raw.slice(0, half).trim(), raw.slice(half).trim()].filter(Boolean);
  }

  return parts;
}

// 可选：单条简单问答
export async function askGeminiOnce(prompt: string, buddy?: BuddyInfo): Promise<string> {
  const arr = await askGeminiMulti(prompt, buddy, { chunks: 2 });
  return arr.join("\n\n");
}
