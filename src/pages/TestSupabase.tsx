// src/pages/TestSupabase.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function TestSupabase() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gratitude_journal")  // ✅ 换成你自己的表名
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setRows(data ?? []);
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Supabase Test</h1>
      {error && <p style={{ color: "tomato" }}>Error: {error}</p>}
      <button
        onClick={async () => {
          const { error } = await supabase
            .from("gratitude_journal")
            .insert({ content: "New gratitude entry 🌸" });
          if (error) alert(error.message);
          else window.location.reload();
        }}
      >
        Insert Test Row
      </button>
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
