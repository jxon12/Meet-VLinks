// src/pages/ResetPasswordPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [exchanged, setExchanged] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 从 URL 解析 type 和 code
  const { type, code } = useMemo(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams;
    const h = new URLSearchParams(url.hash.replace(/^#/, "?"));
    return {
      type: q.get("type") || h.get("type"),
      code: q.get("code") || h.get("code"),
    };
  }, []);

  // 进入页面时，尝试用 code 兑换 session
  useEffect(() => {
    (async () => {
      try {
        if (type !== "recovery") {
          setErr("Invalid reset link. Please request a new one.");
          setLoading(false);
          return;
        }
        if (!code) {
          setErr("Missing code in the URL.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setExchanged(true);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [type, code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!pw || pw.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Password updated successfully. You can now log in with the new password.");
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Reset your password</h2>
        <p>Verifying your reset link…</p>
      </div>
    );
  }

  if (!exchanged) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Reset your password</h2>
        {err ? <p style={{ color: "tomato" }}>{err}</p> : null}
        <p><a href="/">← Back to login</a></p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "32px auto" }}>
      <h2 style={{ marginBottom: 12 }}>Set a new password</h2>
      <form onSubmit={submit}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password (min 8 chars)"
          style={{ display: "block", width: "100%", padding: 10, margin: "8px 0" }}
        />
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Confirm new password"
          style={{ display: "block", width: "100%", padding: 10, margin: "8px 0" }}
        />
        {err && <div style={{ color: "tomato", marginTop: 6 }}>{err}</div>}
        {msg && <div style={{ color: "green", marginTop: 6 }}>{msg}</div>}
        <button type="submit" style={{ marginTop: 12, padding: "10px 14px" }}>
          Update password
        </button>
      </form>
      <p style={{ marginTop: 16 }}><a href="/">← Back to login</a></p>
    </div>
  );
}
