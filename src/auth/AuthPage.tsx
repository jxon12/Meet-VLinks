import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "login" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setErr(error.message);
    else setMsg("Check your email for confirmation.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else setMsg("Login successful!");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) setErr(error.message);
    else setMsg("Password reset link sent to your email.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#0b1325] via-[#0a162b] to-[#050a14] text-white">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">
          {mode === "signup" && "Sign Up"}
          {mode === "login" && "Login"}
          {mode === "forgot" && "Forgot Password"}
        </h2>

        {err && <div className="text-red-400 text-sm mb-2">{err}</div>}
        {msg && <div className="text-green-400 text-sm mb-2">{msg}</div>}

        <form
          onSubmit={
            mode === "signup"
              ? handleSignUp
              : mode === "login"
              ? handleLogin
              : handleForgot
          }
          className="space-y-3"
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-white/30 outline-none"
            />
          )}

          <button
            type="submit"
            className="w-full py-2 bg-[#4253ff] rounded-lg font-semibold hover:bg-[#2f3acb] transition"
          >
            {mode === "signup" && "Sign Up"}
            {mode === "login" && "Login"}
            {mode === "forgot" && "Send Reset Link"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/70 space-y-2">
          {mode === "signup" && (
            <>
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-[#7aa2ff] hover:underline"
                >
                  Login
                </button>
              </p>
              <p>
                Forgot password?{" "}
                <button
                  onClick={() => setMode("forgot")}
                  className="text-[#7aa2ff] hover:underline"
                >
                  Reset
                </button>
              </p>
            </>
          )}

          {mode === "login" && (
            <>
              <p>
                Don’t have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-[#7aa2ff] hover:underline"
                >
                  Sign Up
                </button>
              </p>
              <p>
                Forgot password?{" "}
                <button
                  onClick={() => setMode("forgot")}
                  className="text-[#7aa2ff] hover:underline"
                >
                  Reset
                </button>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <p>
              Remember your password?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-[#7aa2ff] hover:underline"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
