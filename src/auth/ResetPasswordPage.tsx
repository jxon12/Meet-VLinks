import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPasswordPage() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (!p1 || !p2) return setErr("Please enter your new password twice.");
    if (p1 !== p2) return setErr("Passwords do not match.");
    if (p1.length < 8) return setErr("Use at least 8 characters.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setLoading(false);

    if (error) setErr(error.message);
    else setMsg("Password updated! You can now log in with your new password.");
  };

  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b1325"}}>
      <form onSubmit={submit} style={{width:320,padding:20,borderRadius:16,background:"rgba(255,255,255,.08)",color:"#fff",backdropFilter:"blur(8px)"}}>
        <h2 style={{margin:"0 0 12px",fontWeight:700}}>Reset your password</h2>
        {err && <div style={{color:"#ffb4b4",marginBottom:8}}>{err}</div>}
        {msg && <div style={{color:"#b7ffb7",marginBottom:8}}>{msg}</div>}

        <input type="password" value={p1} onChange={e=>setP1(e.target.value)}
          placeholder="New password" style={inpStyle}/>
        <input type="password" value={p2} onChange={e=>setP2(e.target.value)}
          placeholder="Confirm new password" style={inpStyle}/>
        <button disabled={loading} style={btnStyle}>
          {loading ? "Updating…" : "Update password"}
        </button>
        <div style={{marginTop:10}}><a href="/">← Back to login</a></div>
      </form>
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width:"100%",height:44,margin:"6px 0",padding:"0 12px",
  borderRadius:12,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.1)",color:"#fff"
};
const btnStyle: React.CSSProperties = {
  width:"100%",height:44,marginTop:8,borderRadius:12,border:"1px solid rgba(255,255,255,.6)",
  background:"#fff",color:"#000",fontWeight:700
};
