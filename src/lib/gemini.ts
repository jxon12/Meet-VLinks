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

if (!API_KEY) {
  console.warn("[gemini] Missing VITE_GEMINI_API_KEY in your environment.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 先試 Pro，不行再退回 Flash
const PRIMARY_MODEL = "gemini-2.5-pro-latest";
const FALLBACK_MODEL = "gemini-2.5-flash";

function buildSystemPrompt(buddy?: BuddyInfo) {
  const persona =
    buddy?.persona ?? "Kind, supportive, concise. Student-friendly, no medical or clinical claims.";
  const name = buddy?.name ?? "Buddy";
  const safety =
    buddy?.safetyHint ??
    "Never provide harmful instructions. If user shows self-harm risk, encourage reaching out to hotlines and trusted people.";

  return [
    `You are ${name}. Persona: ${persona}.`,
    `Style: short, warm, concrete. Use gentle language. Avoid clinical terms.`,
    `Safety: ${safety}.`,
    `IMPORTANT: Split your full reply into 2-3 SHORT chat-sized messages. Return them as plain text joined by "\n\n---\n\n".`,
  ].join("\n");
}

function asHistory(buddy?: BuddyInfo) {
  return Array.isArray(buddy?.history) ? buddy!.history! : [];
}

async function generateWith(modelName: string, contents: any[], systemInstruction: string) {
  const model = genAI!.getGenerativeModel({
    model: modelName,
    systemInstruction: { parts: [{ text: systemInstruction }] },
  });

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.9,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 512,
    },
    safetySettings: [],
  });

  return result?.response?.text() ?? "";
}

export async function askGeminiMulti(
  userPrompt: string,
  buddy?: BuddyInfo,
  opts?: { chunks?: number }
): Promise<string[]> {
  if (!genAI) {
    return [
      "I’m here with you. (Gemini API key not set).",
      "Add VITE_GEMINI_API_KEY in your .env to enable AI replies.",
    ];
  }

  const system = buildSystemPrompt(buddy);
  const hist = asHistory(buddy);

  const contents = [
    ...hist,
    { role: "user", parts: [{ text: userPrompt }] },
  ];

  let raw = "";
  try {
    raw = (await generateWith(PRIMARY_MODEL, contents, system)).trim();
    if (!raw) throw new Error("empty");
  } catch (e: any) {
    // 404 或不支援時，自動退回 Flash
    raw = (await generateWith(FALLBACK_MODEL, contents, system)).trim();
  }

  if (!raw) return [];

  let parts = raw.split(/\n?\s*---\s*\n?/g).map(s => s.trim()).filter(Boolean);
  const want = Math.min(Math.max(opts?.chunks ?? 3, 2), 3);
  if (parts.length > want) parts = parts.slice(0, want);
  if (parts.length < 2) {
    const half = Math.ceil(raw.length / 2);
    parts = [raw.slice(0, half).trim(), raw.slice(half).trim()].filter(Boolean);
  }
  return parts;
}

export async function askGeminiOnce(prompt: string, buddy?: BuddyInfo): Promise<string> {
  const arr = await askGeminiMulti(prompt, buddy, { chunks: 2 });
  return arr.join("\n\n");
}
