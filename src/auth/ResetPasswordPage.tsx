import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) setErr(error.message);
    else setMsg("Password updated successfully! You can now log in with the new password.");
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Reset your password</h2>
      <form onSubmit={submit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
        />
        <button type="submit">Update password</button>
      </form>
      {err && <div style={{ color: "tomato" }}>{err}</div>}
      {msg && <div style={{ color: "green" }}>{msg}</div>}
      <p><a href="/">← Back to login</a></p>
    </div>
  );
}
