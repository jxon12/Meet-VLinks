// src/auth/ForgotPasswordPage.tsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Forgot password</h2>
      {sent ? (
        <p>We’ve sent a reset link to <b>{email}</b>. Check your inbox.</p>
      ) : (
        <form onSubmit={submit}>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@email.com" />
          <button type="submit">Send reset link</button>
          {err && <div style={{ color: "tomato" }}>{err}</div>}
        </form>
      )}
      <p><a href="/">← Back to sign in</a></p>
    </div>
  );
}
