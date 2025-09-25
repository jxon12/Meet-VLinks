import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * AuthPage - signup / login / forgot / reset (all-in-one)
 *
 * 自动进入 reset 模式的三种途径：
 * 1) URL 中包含 #type=recovery 或 ?type=recovery （Supabase 会带上）
 * 2) Supabase onAuthStateChange 事件为 "PASSWORD_RECOVERY"
 * 3) 外部父组件传入 forceMode="reset"（可选）
 */
type Mode = "signup" | "login" | "forgot" | "reset";

export default function AuthPage({ forceMode }: { forceMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(forceMode || "signup");

  // 通用表单状态
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // reset 专用：确认密码
  const [confirmPassword, setConfirmPassword] = useState("");

  // 提示
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 按钮 loading
  const [busy, setBusy] = useState(false);

  /* -------------------- 自动切换到 reset 模式（多重保险） -------------------- */
  useEffect(() => {
    // 1) 监听 Supabase 的 PASSWORD_RECOVERY 事件
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setErr(null);
        setMsg("Please set a new password.");
      }
    });

    // 2) 解析 URL：Supabase 会在 redirectTo 回来时带上 #type=recovery 或 ?type=recovery
    const h = window.location.hash;   // 例如: #access_token=...&type=recovery
    const s = window.location.search; // 例如: ?type=recovery
    if (/type=recovery/i.test(h) || /type=recovery/i.test(s)) {
      setMode("reset");
      setErr(null);
      setMsg("Please set a new password.");
    }

    return () => data.subscription.unsubscribe();
  }, []);

  // 3) 外部强制
  useEffect(() => {
    if (forceMode) setMode(forceMode);
  }, [forceMode]);

  /* ------------------------------ 处理函数 ------------------------------ */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        // 可选：注册后的验证跳转回首页
        options: { emailRedirectTo: `${window.location.origin}` },
      });
      if (error) throw error;
      setMsg("Sign up successful. Please check your email to confirm.");
      setMode("login");
    } catch (e: any) {
      setErr(e?.message || "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMsg("Login successful!");
      // 这里交由外层 App.tsx 的 onAuthStateChange 去跳转视图
    } catch (e: any) {
      setErr(e?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    setBusy(true);
    try {
      // 重要：redirect 回根路径，这样本页能识别并自动进入 reset 模式
      const redirectTo = `${window.location.origin}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMsg("Password reset link sent. Please check your email (Inbox/Spam).");
      setMode("login");
    } catch (e: any) {
      setErr(e?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setErr("Please enter your new password twice.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErr("Password should be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      // 这一步会在 Supabase 当前恢复 session 上更新密码
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // 安全起见，更新成功后登出，让用户用新密码重新登录
      await supabase.auth.signOut();

      setMsg("Password updated. Please log in with your new password.");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setErr(e?.message || "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0b1325] via-[#0a162b] to-[#050a14] text-white">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">
          {mode === "signup" && "Sign Up"}
          {mode === "login" && "Login"}
          {mode === "forgot" && "Forgot Password"}
          {mode === "reset" && "Reset Password"}
        </h2>

        {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
        {msg && <div className="text-green-400 text-sm mb-2 whitespace-pre-line">{msg}</div>}

        {/* 表单主体 */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-[#4253ff] rounded-lg font-semibold hover:bg-[#2f3acb] transition disabled:opacity-60"
            >
              {busy ? "Creating…" : "Sign Up"}
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-[#4253ff] rounded-lg font-semibold hover:bg-[#2f3acb] transition disabled:opacity-60"
            >
              {busy ? "Logging in…" : "Login"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            <input
              type="email"
              placeholder="Your account email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-[#4253ff] rounded-lg font-semibold hover:bg-[#2f3acb] transition disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 bg-[#34d399] rounded-lg font-semibold hover:bg-[#10b981] transition disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {/* 底部切换 */}
        <div className="mt-4 text-center text-sm text-white/70 space-y-2">
          {mode === "signup" && (
            <>
              <p>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setErr(null); setMsg(null); }} className="text-[#7aa2ff] hover:underline">
                  Login
                </button>
              </p>
              <p>
                Forgot password?{" "}
                <button onClick={() => { setMode("forgot"); setErr(null); setMsg(null); }} className="text-[#7aa2ff] hover:underline">
                  Reset
                </button>
              </p>
            </>
          )}

          {mode === "login" && (
            <>
              <p>
                Don’t have an account?{" "}
                <button onClick={() => { setMode("signup"); setErr(null); setMsg(null); }} className="text-[#7aa2ff] hover:underline">
                  Sign Up
                </button>
              </p>
              <p>
                Forgot password?{" "}
                <button onClick={() => { setMode("forgot"); setErr(null); setMsg(null); }} className="text-[#7aa2ff] hover:underline">
                  Reset
                </button>
              </p>
            </>
          )}

          {(mode === "forgot" || mode === "reset") && (
            <p>
              Back to{" "}
              <button onClick={() => { setMode("login"); setErr(null); setMsg(null); }} className="text-[#7aa2ff] hover:underline">
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
