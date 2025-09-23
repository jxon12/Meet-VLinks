import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

// —— 传入 JAAS（商用）或 meet.jit.si（免费演示）两种模式都可用
type Props = {
  onBack: () => void;

  /** 房间名（同一房间名即可加入同一通话） */
  roomName?: string;

  /** 你的显示名（可选） */
  userName?: string;

  /**
   * 使用 JAAS（推荐生产环境）
   * - domain 固定 "jaas.8x8.vc"
   * - roomName 需要写成 `${appId}/${room}`
   * - 并传入有效的 JWT（token）
   */
  useJaas?: boolean;
  jaasAppId?: string;   // 例如 "vpaas-magic-cookie-1234567890"
  jaasJwt?: string;     // 你的 JAAS JWT
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export default function LobbyWindow({
  onBack,
  roomName = "OceanOfficeDemo",
  userName = "Guest",
  useJaas = false,
  jaasAppId,
  jaasJwt,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // 选择域名 + 处理 JAAS 房间名
  const { domain, finalRoomName, jwt } = useMemo(() => {
    if (useJaas) {
      const appId = jaasAppId || "YOUR_JAAS_APP_ID";
      return {
        domain: "jaas.8x8.vc",
        finalRoomName: `${appId}/${roomName}`,
        jwt: jaasJwt || "YOUR_JAAS_JWT",
      };
    }
    return { domain: "meet.jit.si", finalRoomName: roomName, jwt: undefined as string | undefined };
  }, [useJaas, jaasAppId, jaasJwt, roomName]);

  // 动态加载 IFrame API（只加载一次）
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = `https://${useJaas ? "8x8.vc" : "meet.jit.si"}/external_api.js`;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => console.error("Failed to load Jitsi external_api.js");
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, [useJaas]);

  // 初始化会议
  useEffect(() => {
    if (!ready || !containerRef.current || !window.JitsiMeetExternalAPI) return;

    // 先清掉旧实例
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch {}
      apiRef.current = null;
    }

    const parentNode = containerRef.current;
    const width = "100%";
    const height = "100%";

    const options: any = {
      roomName: finalRoomName,
      parentNode,
      width,
      height,
      userInfo: { displayName: userName },
      jwt, // JAAS 时需要；meet.jit.si 留空即可
      configOverwrite: {
        disableDeepLinking: true,          // 禁止跳转到原生 App
        prejoinPageEnabled: false,         // 直接进会
        startWithAudioMuted: true,
        startWithVideoMuted: false,
        // 竖屏体验更友好（让视频按 9:16/全屏自适应）
        constraints: { video: { aspectRatio: 9 / 16 } },
      },
      interfaceConfigOverwrite: {
        MOBILE_APP_PROMO: false,
        // 精简工具栏（你可按需增减）
        TOOLBAR_BUTTONS: [
          "microphone", "camera", "desktop", "chat", "participants-pane",
          "tileview", "hangup"
        ],
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    apiRef.current = api;

    // 可选：事件监听
    api.addListener("videoConferenceJoined", () => {
      // eslint-disable-next-line no-console
      console.log("Joined:", finalRoomName);
    });

    // 卸载时清理
    return () => {
      try { api.dispose(); } catch {}
      apiRef.current = null;
    };
  }, [ready, domain, finalRoomName, userName, jwt]);

  return (
    <div className="relative h-full w-full bg-black">
      {/* 顶部栏（返回） */}
      <div className="absolute z-20 top-0 inset-x-0 h-12 px-3 flex items-center gap-3 bg-black/40 backdrop-blur border-b border-white/10">
        <button
          onClick={() => {
            // 先安全销毁，再返回
            try { apiRef.current?.dispose?.(); } catch {}
            onBack();
          }}
          className="rounded-full p-2 bg-white/10 border border-white/20 hover:bg-white/15"
          aria-label="Back"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="text-white/85 text-sm tracking-[0.2em]">
          MEET
        </div>
        {/* 小屏保持高度，避免顶栏遮住按钮 */}
        <div className="ml-auto text-[11px] text-white/60 hidden sm:block">
          {useJaas ? "JAAS" : "meet.jit.si (demo)"}
        </div>
      </div>

      {/* 容器：手机竖屏与桌面自适应 */}
      <div
        ref={containerRef}
        className="absolute inset-0 pt-12"
        style={{
          // 让视频区域占满，且在移动端（竖屏）优先 9:16 视觉
          // 由 Jitsi 自适应布局，外层只负责全屏容器
          // 如果你希望强制 9:16，可把下面注释解开：
          // aspectRatio: "9 / 16",
        }}
      />
    </div>
  );
}
