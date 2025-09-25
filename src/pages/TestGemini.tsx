import React, { useState } from "react";
import { testGemini } from "../lib/gemini";

export default function TestGemini() {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    setLoading(true);
    try {
      const res = await testGemini("Hello Gemini, how are you?");
      setAnswer(res);
    } catch (err) {
      setAnswer("Error: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={handleAsk}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Ask Gemini
      </button>

      {loading && <p className="mt-4 text-gray-600">⏳ Loading…</p>}

      {answer && (
        <div className="mt-4 p-4 rounded bg-gray-100 text-black">
          {answer}
        </div>
      )}
    </div>
  );
}
