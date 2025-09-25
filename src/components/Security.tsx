// src/components/Security.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Lock, Smartphone, LogOut, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Props = { onBack: () => void };

type DeviceSession = {
  id: string;
  browser: string;
  os: string;
  locale?: string;
  tz?: string;
  last_seen_at?: string;
  is_current?: boolean;
};

// 你的 Edge Function（已部署）
const DELETE_FN_URL =
  "https://ariunqqaquekweygjgkh.supabase.co/functions/v1/delete-user";

/** 动态解析 sessionClient 里真实导出的函数名，避免命名不一致导致的编译/运行错误 */
async function loadSessionAPI() {
  const mod: any = await import("../lib/sessionClient");

  const list =
    mod.listSessions ||
    mod.getSessions ||
    mod.listDeviceSessions ||
    mod.fetchSessions;

  const signOutOne =
    mod.signOutSession ||
    mod.revokeSession ||
    mod.signOutDevice ||
    mod.logoutDevice;

  const signOutOthers =
    mod.signOutAllExceptThis ||
    mod.signOutOthers ||
    mod.logoutAllExceptThis ||
    mod.revokeOthers;

  if (!list) {
    throw new Error(
      "sessionClient 未导出 listSessions / getSessions（或等价函数）。请在 src/lib/sessionClient.ts 导出其中一个。"
    );
  }
  if (!signOutOne) {
    throw new Error(
      "sessionClient 未导出 signOutSession / signOutDevice（或等价函数）。"
    );
  }
  // signOutOthers 可选：没有就用回退实现
  return { list, signOutOne, signOutOthers };
}

export default function Security({ onBack }: Props) {
  // ===== 修改密码 =====
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const changePassword = async () => {
    if (!newPwd || newPwd.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      alert("Passwords do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setNewPwd("");
      setConfirmPwd("");
      alert("Password updated ✅");
    } catch (e: any) {
      alert(e?.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  // ===== 设备列表 =====
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const apiRef = useRef<{
    list: () => Promise<DeviceSession[]>;
    signOutOne: (sid: string) => Promise<void>;
    signOutOthers?: () => Promise<void>;
  } | null>(null);

  const loadDevices = async () => {
    setDevicesLoading(true);
    try {
      if (!apiRef.current) {
        const api = await loadSessionAPI();
        apiRef.current = api as any;
      }
      const rows = await apiRef.current!.list();
      setDevices(rows || []);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to load devices.");
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSignOutDevice = async (sid: string) => {
    try {
      if (!apiRef.current) apiRef.current = (await loadSessionAPI()) as any;
      await apiRef.current!.signOutOne(sid);
      await loadDevices();
    } catch (e: any) {
      alert(e?.message || "Could not sign out that device.");
    }
  };

  const handleSignOutAllOthers = async () => {
    if (!confirm("Sign out from all other devices?")) return;
    try {
      if (!apiRef.current) apiRef.current = (await loadSessionAPI()) as any;
      if (apiRef.current!.signOutOthers) {
        await apiRef.current!.signOutOthers!();
      } else {
        // 回退：本地把非当前设备一一签掉
        for (const d of devices) {
          if (!d.is_current) await apiRef.current!.signOutOne(d.id);
        }
      }
      await loadDevices();
    } catch (e: any) {
      alert(e?.message || "Could not sign out others.");
    }
  };

  // ===== 删除账户 =====
  const [delLoading, setDelLoading] = useState(false);
  const deleteMyAccount = async () => {
    if (!confirm("This will permanently delete your VLinks account and data. Continue?")) {
      return;
    }
    setDelLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.access_token) {
        throw new Error("No active session.");
      }
      const resp = await fetch(DELETE_FN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Delete failed (${resp.status}). ${text || ""}`);
      }
      await supabase.auth.signOut();
      alert("Account deleted. Peace out 🌊");
      window.location.href = "/";
    } catch (e: any) {
      alert(e?.message || "Could not delete account.");
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1325] via-[#0a162b] to-[#050a14] text-white">
      {/* 顶部栏 */}
      <div className="h-14 px-4 flex items-center justify-between sticky top-0 backdrop-blur-md bg-white/5 border-b border-white/10 z-10">
        <button
          onClick={onBack}
          className="grid place-items-center w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="tracking-[0.18em] font-semibold">SECURITY</div>
        <div className="w-9 h-9 opacity-0" />
      </div>

      <div className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Change password */}
        <section className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
          <div className="flex items-center gap-2 text-white/90 mb-3">
            <Lock className="w-4 h-4" /> Change Password
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="New password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/15 outline-none"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/15 outline-none"
            />
            <button
              onClick={changePassword}
              disabled={pwdLoading}
              className="mt-2 w-full h-11 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition disabled:opacity-60"
            >
              {pwdLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </section>

        {/* Logged-in Devices */}
        <section className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
          <div className="flex items-center gap-2 text-white/90 mb-3">
            <Smartphone className="w-4 h-4" /> Logged-in Devices
          </div>

          {devicesLoading ? (
            <div className="text-sm text-white/60">Loading…</div>
          ) : devices.length === 0 ? (
            <div className="text-sm text-white/60">No active devices.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between rounded-xl border ${
                    d.is_current
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/10 bg-white/5"
                  } px-3 py-2`}
                >
                  <div className="min-w-0">
                    <div className="text-white/95 truncate">
                      {d.browser} • {d.os}{" "}
                      {d.is_current && (
                        <span className="text-emerald-300 ml-2">This device</span>
                      )}
                    </div>
                    <div className="text-white/60 text-xs truncate">
                      {d.locale || "en-US"} • {d.tz || "Asia/Kuala_Lumpur"} • Last seen:{" "}
                      {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}
                    </div>
                  </div>
                  {/* 只有图标按钮，不显示“Sign out”文字 */}
                  {!d.is_current && (
                    <button
                      title="Sign out"
                      onClick={() => handleSignOutDevice(d.id)}
                      className="p-2 rounded-lg border border-white/15 hover:bg-white/10 transition"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {devices.length > 1 && (
            <button
              onClick={handleSignOutAllOthers}
              className="mt-3 w-full h-10 rounded-xl border border-white/20 hover:bg-white/10 transition text-white/90 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out from other devices
            </button>
          )}
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur p-4">
          <div className="flex items-center gap-2 text-red-300/90 mb-2">
            <Trash2 className="w-4 h-4" /> Danger Zone
          </div>
          <button
            onClick={deleteMyAccount}
            disabled={delLoading}
            className="w-full h-11 rounded-xl border border-red-400/40 text-red-200 hover:bg-red-500/10 transition disabled:opacity-60"
          >
            {delLoading ? "Deleting…" : "Delete my account"}
          </button>
        </section>
      </div>
    </div>
  );
}
