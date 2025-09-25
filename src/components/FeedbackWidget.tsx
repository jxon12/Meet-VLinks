import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Props = {
  quizId?: string;
  score?: number;
  level?: string;
  lang?: "en" | "zh" | "ms";
};

const starBase =
  "inline-flex items-center justify-center w-8 h-8 rounded-md border transition select-none";

export default function FeedbackWidget({ quizId, score, level, lang = "en" }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const ua = useMemo(() => navigator.userAgent.slice(0, 180), []);

  // English-only labels
  const labels = {
    title: "Was this helpful?",
    hint: "Rate and leave a note (optional)",
    placeholder: "Your suggestion or issue (optional)",
    email: "Email (optional, if you'd like a reply)",
    submit: "Submit feedback",
    thanks: "Thanks for your feedback! We’ll keep improving 💪",
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      quiz_id: quizId ?? null,
      rating,
      comment: comment || null,
      lang: "en", // force English output
      score: score ?? null,
      result_level: level ?? null,
      path: window.location.pathname,
      ua,
      contact_email: email || null,
    });
    setSubmitting(false);
    if (!error) setDone(true);
    else alert(`Submit failed: ${error.message}`);
  }

  if (done) {
    return (
      <div className="mt-5 rounded-xl bg-white/10 border border-white/15 p-4 text-sm text-white">
        {labels.thanks}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-xl bg-white/10 border border-white/15 p-4 text-white"
    >
      <div className="font-medium mb-1">{labels.title}</div>
      <div className="text-xs text-white/80 mb-3">{labels.hint}</div>

      {/* Stars */}
      <div className="flex gap-2 mb-3" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((s) => {
          const active = (hover || rating) >= s;
          return (
            <button
              key={s}
              type="button"
              aria-label={`${s} star`}
              aria-checked={rating === s}
              role="radio"
              className={`${starBase} ${
                active
                  ? "border-white/80 bg-white/10 scale-[1.05]"
                  : "border-white/30 bg-white/5 hover:border-white/50"
              }`}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
            >
              <span className={active ? "text-white text-lg" : "text-white/40 text-lg"}>
                {active ? "★" : "☆"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Comment */}
      <textarea
        className="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40 placeholder-white/40 text-white"
        rows={3}
        placeholder={labels.placeholder}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {/* Email (optional) */}
      <input
        className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 p-3 text-sm outline-none focus:border-white/40 placeholder-white/40 text-white"
        type="email"
        placeholder={labels.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="mt-3">
        <button
          type="submit"
          disabled={!rating || submitting}
          className={`h-10 px-4 rounded-xl font-medium border ${
            rating && !submitting
              ? "bg-white text-black border-white hover:bg-white/90"
              : "bg-white/15 text-white/60 border-white/20 cursor-not-allowed"
          }`}
        >
          {submitting ? "…" : labels.submit}
        </button>
      </div>
    </form>
  );
}
