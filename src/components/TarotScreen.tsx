// src/components/TarotScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ShieldAlert } from "lucide-react";

type Props = {
  onBack: () => void;
  onOpenSafety: () => void;
  forceSafety?: boolean;
  handoffText?: string;
};

const MAX = 5;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

/** GitHub raw images base */
const GH_IMAGE_BASE = "https://raw.githubusercontent.com/jxon12/tarot/main";
const cardSrcById = (id: number) => `${GH_IMAGE_BASE}/${String(id).padStart(2, "0")}.png`;

/** local fallback meanings */
const LOCAL_MEANINGS: Record<number, string> = {
  1: "New beginnings — fresh energy, potential.",
  2: "Partnerships — connections, collaboration.",
  3: "Inner peace — reflection, rest.",
  4: "Transition — travel or change in direction.",
  5: "Growth — steady development.",
  6: "Emotion — sensitivity, relationships.",
  7: "Play — creativity and hobby time.",
  8: "Boundaries — repair or fix what's broken.",
  9: "Puzzle — seek perspective and small solutions.",
  10: "Home — roots and safety.",
  11: "Transformation — subtle shifts that matter.",
  12: "Nurture — tending something with care.",
  13: "Weathering — small storms, stay steady.",
  14: "Wander — curiosity, exploration.",
  15: "Joy — celebration and lightness.",
  16: "Direction — inner compass, choices.",
  17: "Protection — shield, slow down.",
  18: "Spark — small miracles, inspiration.",
  19: "Melody — rhythm, consistency.",
  20: "Study — knowledge, books.",
  21: "Balance — yin-yang, integration.",
  22: "Magic — try a small ritual.",
  23: "Gift — small surprising help.",
  24: "Reflection — write or record your thoughts.",
};

/** local reading fallback */
function generateLocalReading(selected: number[], category: string, desc: string) {
  const lines: string[] = [];
  lines.push(`Category: ${category}`);
  lines.push(`Question: ${desc}`);
  lines.push("");
  const picks = selected.map((id) => LOCAL_MEANINGS[id] || "A quiet hint.");
  lines.push(`Reading summary: ${picks.slice(0, 3).join(" / ")}`);
  lines.push("");
  lines.push("Practical suggestions:");
  lines.push("- Choose one small action you can do today related to the reading.");
  lines.push("- Note how you feel after trying it for three days.");
  lines.push("");
  lines.push("For reference only. Not professional advice.");
  return lines.join("\n");
}

/** Gemini call with auto fallback Pro -> Flash */
async function callGemini(promptText: string) {
  if (!GEMINI_KEY) throw new Error("Missing VITE_GEMINI_API_KEY");

  const models = ["gemini-2.5-pro", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_KEY}`;

      const body = {
        system_instruction: {
          role: "user",
          parts: [
            {
              text:
                "You are an empathetic, concise divination assistant. Always reply in clear English, warm and nonjudgmental. Provide a short 3-6 sentence reading, then give 2 short practical suggestions. Finish with one line: 'For reference only. Not professional advice.'",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
        safetySettings: [],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const txt = await res.text();
      if (!res.ok) {
        let j: any;
        try { j = JSON.parse(txt); } catch {}
        const code = j?.error?.code;
        const msg = j?.error?.message || txt;
        const err = new Error(`Gemini error ${res.status}${code ? ` (${code})` : ""}: ${msg}`);
        (err as any).status = res.status;
        (err as any).json = j;
        throw err;
      }

      let data: any = {};
      try { data = JSON.parse(txt); } catch {}

      const blocked =
        data?.promptFeedback?.blockReason ||
        data?.candidates?.[0]?.finishReason === "SAFETY";
      if (blocked) {
        console.warn("Gemini safety block:", data?.promptFeedback);
        return "(no response due to safety block)";
      }

      const parts =
        data?.candidates?.[0]?.content?.parts ??
        (data?.candidates?.[0]?.output ? [{ text: data.candidates[0].output }] : []);
      const text = parts.map((p: any) => p?.text).filter(Boolean).join("\n").trim();

      if (text) return text;
      throw new Error("Empty response");
    } catch (e) {
      lastError = e;
      console.warn(`Model ${/* keep simple label */""} failed:`, e);
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  throw lastError || new Error("All models failed");
}

/** Component */
export default function TarotScreen({ onBack, onOpenSafety, forceSafety = false, handoffText }: Props) {
  const [step, setStep] = useState<"category" | "describe" | "pick" | "result">("category");
  const [category, setCategory] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [showSafety, setShowSafety] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { if (forceSafety) setShowSafety(true); }, [forceSafety]);

  const cards = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => {
      const id = i + 1;
      return { id, src: cardSrcById(id), alt: `Card ${id}` };
    });
  }, []);

  useEffect(() => {
    cards.slice(0, 8).forEach((c) => { const img = new Image(); img.src = c.src; });
  }, [cards]);

  function toggleCard(id: number) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX
        ? [...prev, id]
        : prev
    );
  }

  function resetAll() {
    setCategory(null);
    setDesc("");
    setSelected([]);
    setAiResult(null);
    setErrorMsg(null);
    setStep("category");
  }

  async function submitPick() {
    setErrorMsg(null);
    if (!category) { setErrorMsg("Please choose a category."); return; }
    if (!desc.trim()) { setErrorMsg("Please enter your question/concern."); return; }
    if (selected.length !== MAX) { setErrorMsg(`Please pick exactly ${MAX} cards.`); return; }

    setAiLoading(true);
    setAiResult(null);
    setStep("pick");

    const prompt = [
      `Category: ${category}`,
      `Question: ${desc}`,
      `Selected cards: ${selected.join(", ")}`,
      `Provide: 1) A short, warm 3-6 sentence reading; 2) Two practical next steps; 3) A single-line disclaimer.`,
      `Output in English.`,
    ].join("\n\n");

    try {
      const text = await callGemini(prompt);
      setAiResult(text.trim());
      setStep("result");
    } catch (e: any) {
      console.error("AI error:", e);
      setErrorMsg(`AI error: ${e?.message || String(e)}. Using fallback reading.`);
      setAiResult(generateLocalReading(selected, category!, desc));
      setStep("result");
    } finally {
      setAiLoading(false);
    }
  }

  if (showSafety) {
    return (
      <div className="relative w-full h-full p-4" style={{ color: "#f0f8ff" }}>
        <div className="flex items-center gap-2 text-red-300 mb-3"><ShieldAlert /> Safety Notice</div>
        {handoffText && <div className="bg-red-700/10 p-3 rounded mb-3">Detected: “{handoffText}”</div>}
        <p className="mb-3">If you are at risk, contact local emergency services. Befrienders KL: 03-7627 2929</p>
        <button onClick={() => { setShowSafety(false); onOpenSafety(); }} className="h-10 px-3 rounded bg-indigo-600 text-white">Acknowledge & Back</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      {/* background */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "radial-gradient(circle at 20% 10%, rgba(50,80,120,0.12), transparent 25%), linear-gradient(180deg,#030317 0%,#071224 60%)"
      }} />

      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* header */}
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <button onClick={onBack} style={{ position: "absolute", left: 12, top: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", color: "#dbeafe", border: "1px solid rgba(255,255,255,0.04)", padding: 8 }}>
            <ChevronLeft />
          </button>
          <div style={{ color: "#e6f7ff", fontWeight: 600, letterSpacing: 1 }}>Divination Room</div>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {/* disclaimer */}
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.04)", color: "#cfe8ff", fontSize: 13 }}>
            For reference only. Not professional advice.
          </div>

          {errorMsg && (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "rgba(255,0,0,0.04)", border: "1px solid rgba(255,0,0,0.06)", color: "#ffd6d6" }}>
              {errorMsg}
            </div>
          )}

          {/* step: category */}
          {step === "category" && (
            <>
              <div style={{ color: "#bfe9ff", marginBottom: 8 }}>Choose category</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
                {["Intimate relationship", "Career / study", "Interpersonal", "Self-growth"].map((c) => (
                  <button key={c} onClick={() => { setCategory(c); setStep("describe"); }}
                          style={{
                            padding: 12, borderRadius: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                            border: "1px solid rgba(255,255,255,0.04)", color: "#e6f7ff", fontWeight: 600
                          }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onBack} style={{ flex: 1, padding: 12, borderRadius: 12, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>Cancel</button>
              </div>
            </>
          )}

          {/* step: describe */}
          {step === "describe" && (
            <>
              <div style={{ color: "#bfe9ff", marginBottom: 8 }}>Describe your question</div>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 300))}
                placeholder="Type your question or concern..."
                style={{ width: "100%", minHeight: 100, borderRadius: 12, padding: 12, background: "rgba(255,255,255,0.02)", color: "#eaf8ff", border: "1px solid rgba(255,255,255,0.03)", marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep("category")} style={{ padding: 10, borderRadius: 10, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>Back</button>
                <button
                  onClick={() => {
                    if (!desc.trim()) { setErrorMsg("Please enter your question."); return; }
                    setErrorMsg(null);
                    setSelected([]);
                    setStep("pick");
                  }}
                  style={{ flex: 1, padding: 10, borderRadius: 10, background: "#6dd3ff", color: "#001017", fontWeight: 700 }}
                >
                  Continue to choose cards
                </button>
              </div>
            </>
          )}

          {/* step: pick */}
          {step === "pick" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: "#bfe9ff" }}>Pick {MAX} cards</div>
                <div style={{ color: "#9fbddb" }}>{selected.length}/{MAX}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {cards.map((c) => {
                  const isSelected = selected.includes(c.id);
                  const disabled = !isSelected && selected.length >= MAX;
                  return (
                    <button
                      key={c.id}
                      onClick={() => !disabled && toggleCard(c.id)}
                      disabled={disabled}
                      style={{
                        aspectRatio: "0.7/1",
                        borderRadius: 12,
                        overflow: "hidden",
                        position: "relative",
                        border: isSelected ? "2px solid rgba(120,200,255,0.9)" : "1px solid rgba(255,255,255,0.04)",
                        transform: isSelected ? "scale(1.03)" : "none",
                        transition: "transform .18s ease, box-shadow .18s ease",
                        boxShadow: isSelected ? "0 10px 30px rgba(60,140,200,0.18)" : "none",
                      }}
                    >
                      <img src={c.src} alt={c.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "saturate(95%) contrast(95%)" }} />
                      <div style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: 16, background: isSelected ? "linear-gradient(90deg,#7dd3fc,#6366f1)" : "rgba(0,0,0,0.35)", color: "white", display: "grid", placeItems: "center", fontWeight: 700 }}>
                        {isSelected ? (selected.indexOf(c.id) + 1) : "+"}
                      </div>
                      {disabled && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.45))" }} />}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep("describe")} style={{ padding: 10, borderRadius: 10, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>Back</button>
                <button onClick={resetAll} style={{ padding: 10, borderRadius: 10, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>Reset</button>
                <button
                  onClick={() => submitPick()}
                  disabled={selected.length !== MAX || aiLoading}
                  style={{ flex: 1, padding: 10, borderRadius: 10, background: "#6dd3ff", color: "#001017", fontWeight: 700 }}
                >
                  {aiLoading ? "Generating..." : "Reveal reading"}
                </button>
              </div>
            </>
          )}

          {/* step: result */}
          {step === "result" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#bfe9ff", marginBottom: 8 }}>Selected cards</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.map((id, i) => (
                    <div key={id} style={{ width: 84, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <img src={cardSrcById(id)} alt={`Card ${id}`} style={{ width: "100%", height: 110, objectFit: "cover" }} />
                      <div style={{ textAlign: "center", padding: 6, color: "#e6f7ff", fontSize: 12 }}>{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#bfe9ff", marginBottom: 8 }}>AI Reading</div>
                <div style={{ padding: 12, borderRadius: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.04)", color: "#dff7ff", whiteSpace: "pre-wrap" }}>
                  {aiResult || "No reading available."}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setStep("pick"); setAiResult(null); }} style={{ padding: 10, borderRadius: 10, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>Back</button>
                <button onClick={resetAll} style={{ padding: 10, borderRadius: 10, background: "transparent", color: "#9fbddb", border: "1px solid rgba(255,255,255,0.03)" }}>New reading</button>
                <button
                  onClick={() => {
                    if (!aiResult) return;
                    navigator.clipboard?.writeText(`Category: ${category}\nQuestion: ${desc}\n\n${aiResult}`);
                  }}
                  style={{ flex: 1, padding: 10, borderRadius: 10, background: "#6dd3ff", color: "#001017", fontWeight: 700 }}
                >
                  Copy reading
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
