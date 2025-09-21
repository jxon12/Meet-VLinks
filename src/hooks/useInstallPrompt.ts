// src/hooks/useInstallPrompt.ts
import { useEffect, useState } from "react";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const onBeforeInstall = (e: any) => {
      // 阻止浏览器默认气泡，让我们自己控制何时弹
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return { accepted: false };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // 用过一次就清空
    setDeferredPrompt(null);
    return { accepted: choice.outcome === "accepted" };
  };

  return { deferredPrompt, promptInstall };
}
