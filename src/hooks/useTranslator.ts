// src/hooks/useTranslator.ts
import { useState, useRef, useMemo } from "react";

type TranslateResult = { text: string; langFrom?: string; langTo: string };

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

// 规范化目标语言（把 zh-CN/zh-TW → zh，en-US → en 等）
function normalizeLang(input?: string) {
  const raw = (input || "en").toLowerCase();
  const map: Record<string, string> = {
    "zh-cn": "zh",
    "zh-sg": "zh",
    "zh-hk": "zh",
    "zh-tw": "zh",
    "ms-my": "ms",
    "en-us": "en",
    "en-gb": "en",
  };
  return map[raw] || raw.split("-")[0];
}

export function useTranslator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mem = useRef<Map<string, TranslateResult>>(new Map());

  const translate = useMemo(
    () => async (text: string, to?: string): Promise<TranslateResult> => {
      setError(null);
      const target = normalizeLang(to || navigator.language || "en");

      // 简单内存缓存（避免同文反复请求）
      const key = `${text}::${target}`;
      const cached = mem.current.get(key);
      if (cached) return cached;

      setLoading(true);
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            GEMINI_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      // 提示：翻译为目标语言，保持自然、不过度意译，保留原换行
                      text: `Translate the following text into "${target}". Keep the meaning natural and preserve line breaks. Reply with ONLY the translated text:\n\n${text}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const output =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

        const result: TranslateResult = {
          text: output,
          langFrom: "auto",
          langTo: target,
        };

        mem.current.set(key, result);
        return result;
      } catch (e: any) {
        setError(e?.message || "Translate failed");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { translate, loading, error };
}
