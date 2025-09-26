// src/pages/ResetTester.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetTester() {
  const [stage, setStage] = useState<"boot" | "ready" | "exchanged">("boot");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // 1) 进入页面就尝试把 URL 中的 code/#token 兑换成 session（兜底）
  useEffect(() => {
    (async () => {
      setMsg("Checking existing session…");
      const { data } = await supabase.auth.getSession();
      setSessionInfo(data.session);
      if (!data.session) {
        try {
          setMsg("No session yet. Trying exchangeCodeForSession()…");
          await supabase.auth.exchangeCodeForSession(window.location.href);
          const { data: after } = await supabase.auth.getSession();
          setSessionInfo(after.session);
          setStage("exchanged");
          setMsg("Session acquired via exchangeCodeForSession().");
        } catch (e: any) {
          setErr(e?.message || "exchangeCodeForSession failed.");
        }
      } else {
        setMsg("Session already present.");
        setStage("ready");
      }
    })();
  }, []);

  // 2) 手动再试一次（如果需要）
  const forceExchange = async () => {
    setErr(null); setMsg(null);
    try {
      setMsg("Trying exchangeCodeForSession()…");
      await supabase.auth.exchangeCodeForSession(window.location.href);
      const { data } = await supabase.auth.getSession();
      setSessionInfo(data.session);
      setMsg("OK, session acquired.");
    } catch (e: any) {
      setErr(e?.message || "exchangeCodeForSession failed.");
    }
  };

  // 3) 真正更新密码（双输入校验）
  const handleUpdate = async (e: React.FormEvent) => {
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#071024,#0a1a2f)",
      color: "#fff",
      padding: 24
    }}>
      <div style={{maxWidth: 520, margin: "0 auto"}}>
        <h1 style={{marginBottom: 8}}>🔧 Reset Tester</h1>
        <p style={{opacity:.8, marginBottom:16}}>
          Path: <code>{window.location.pathname}{window.location.search}{window.location.hash}</code>
        </p>

        {msg && <div style={{marginBottom:10, padding:10, border:"1px solid #5fa8ff33", borderRadius:8, background:"#5fa8ff14"}}>{msg}</div>}
        {err && <div style={{marginBottom:10, padding:10, border:"1px solid #ff6b6b33", borderRadius:8, background:"#ff6b6b14"}}>{err}</div>}

        <div style={{marginBottom:16}}>
          <button onClick={forceExchange}
                  style={{padding:"8px 12px", borderRadius:10, border:"1px solid #ffffff33", background:"#ffffff14"}}>
            Force exchangeCodeForSession()
          </button>
        </div>

        <div style={{marginBottom:16, fontSize:14, opacity:.9}}>
          <b>Session present?</b> {sessionInfo ? "✅ YES" : "❌ NO"}
          {sessionInfo && (
            <div style={{marginTop:8}}>
              <div>User: <code>{sessionInfo.user?.email}</code></div>
              <div>Exp: <code>{sessionInfo.expires_at}</code></div>
            </div>
          )}
        </div>

        <hr style={{borderColor:"#ffffff22", margin:"16px 0"}} />

        <h3 style={{marginBottom:8}}>Set a new password</h3>
        <form onSubmit={handleUpdate} style={{display:"grid", gap:10}}>
          <input type="password" placeholder="New password"
                 value={p1} onChange={e=>setP1(e.target.value)}
                 style={inp}/>
          <input type="password" placeholder="Confirm new password"
                 value={p2} onChange={e=>setP2(e.target.value)}
                 style={inp}/>
          <button disabled={busy}
                  style={{padding:"10px 14px", borderRadius:10, border:"1px solid #fff2", background:"#fff", color:"#000"}}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>

        <div style={{marginTop:16, fontSize:13, opacity:.8}}>
          Tips:
          <ul style={{margin:"8px 0 0 16px", lineHeight:1.6}}>
            <li>确保 Supabase 的 Site URL/Redirect URLs 都是当前域名（https）。</li>
            <li>如果使用 SendGrid，关闭 Click Tracking，避免 # 片段丢失。</li>
            <li>不要用旧邮件；每次测试都重新发送 reset 邮件。</li>
            <li>必要时复制链接到隐身窗口测试，避免邮箱提前“点开”占用 OTP。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.2)",
  color: "#fff",
  padding: "0 12px",
  outline: "none"
};
