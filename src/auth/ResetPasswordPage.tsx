import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (e) {
          // 这里可提示“链接已失效或被修改”
          console.warn("exchange failed", e);
        }
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (!p1 || !p2) return setErr("Please fill both fields.");
    if (p1 !== p2) return setErr("Passwords do not match.");
    if (p1.length < 8) return setErr("Use at least 8 characters.");

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Password updated! You can now log in with the new password.");
  };

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "40px auto", color: "#fff" }}>
      <h2>Set a new password</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input
          type="password"
          value={p1}
          onChange={e => setP1(e.target.value)}
          placeholder="New password"
        />
        <input
          type="password"
          value={p2}
          onChange={e => setP2(e.target.value)}
          placeholder="Confirm new password"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      {err && <div style={{ color: "tomato", marginTop: 8 }}>{err}</div>}
      {msg && <div style={{ color: "springgreen", marginTop: 8 }}>{msg}</div>}
      <p style={{ marginTop: 12 }}><a href="/">← Back to login</a></p>
    </div>
  );
}
