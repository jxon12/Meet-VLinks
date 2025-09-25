import { useEffect, useRef, useState } from "react";

type Options = {
  startHour?: number;     // 晚间开始（本地时区，24h）
  endHour?: number;       // 晚间结束（可跨天）
  minActiveMs?: number;   // 触发所需活跃时长
  storageKeyBase?: string;
};

function isInQuietHours(now: Date, startHour: number, endHour: number) {
  const h = now.getHours();
  if (startHour <= endHour) {
    // 例如 22–23
    return h >= startHour && h < endHour;
  } else {
    // 跨天，例如 23–2
    return h >= startHour || h < endHour;
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

export function useLateNightNudge(opts: Options = {}) {
  const {
    startHour = 23,
    endHour = 2,
    minActiveMs = 3 * 60 * 1000, // 连续活跃 3 分钟
    storageKeyBase = "vlinks:lateNudge",
  } = opts;

  const [open, setOpen] = useState(false);
  const activeMsRef = useRef(0);
  const lastActivityRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  const today = todayKey();
  const shownKey = `${storageKeyBase}:shown:${today}`;
  const snoozeKey = `${storageKeyBase}:snoozeUntil`; // ISO string
  const disableKey = `${storageKeyBase}:disabled`;

  // === 偏好读取 ===
  const isDisabled = localStorage.getItem(disableKey) === "1";
  const shownToday = localStorage.getItem(shownKey) === "1";
  const snoozeUntilISO = localStorage.getItem(snoozeKey);
  const snoozeUntil = snoozeUntilISO ? new Date(snoozeUntilISO) : null;

  // === 活跃监听：pointer / key ===
  useEffect(() => {
    if (isDisabled) return;

    const onActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      // 懒启动计时器
      if (tickTimerRef.current == null) {
        tickTimerRef.current = window.setInterval(() => {
          if (!lastActivityRef.current) return;
          // 1 秒检查一次是否仍在活跃窗口
          const diff = Date.now() - (lastActivityRef.current ?? 0);
          // 将“最近1秒内有活动”视为持续活跃的累计
          if (diff <= 1000) {
            activeMsRef.current += 1000;
          }
          // 满足条件，尝试弹窗
          maybeOpen();
        }, 1000) as unknown as number;
      }
    };

    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (tickTimerRef.current != null) {
        clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled]); // 只需在 disable 变化时重绑

  function maybeOpen() {
    if (open) return;
    if (isDisabled) return;
    if (shownToday) return;
    if (snoozeUntil && new Date() < snoozeUntil) return;

    const now = new Date();
    if (!isInQuietHours(now, startHour, endHour)) return;

    if (activeMsRef.current >= minActiveMs) {
      setOpen(true);
      localStorage.setItem(shownKey, "1"); // 当晚只弹一次
    }
  }

  // === 动作 ===
  const dismiss = () => setOpen(false);

  const remindTomorrow = () => {
    // 清除今天的 shown，改为明天再提醒
    setOpen(false);
    // 明天 00:00:00
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    localStorage.setItem(snoozeKey, t.toISOString());
  };

  const disableTonight = () => {
    // 今晚 08:00 恢复（可自定义）
    setOpen(false);
    const t = new Date();
    if (t.getHours() >= startHour || t.getHours() < endHour) {
      // 仍在晚间，设一个清晨时间恢复
      const restore = new Date();
      restore.setHours(8, 0, 0, 0);
      localStorage.setItem(snoozeKey, restore.toISOString());
    } else {
      // 已不在晚间，直接设短暂停
      const restore = new Date(Date.now() + 2 * 60 * 60 * 1000);
      localStorage.setItem(snoozeKey, restore.toISOString());
    }
  };

  const disableForever = () => {
    setOpen(false);
    localStorage.setItem(disableKey, "1");
  };

  const enableAgain = () => {
    localStorage.removeItem(disableKey);
    localStorage.removeItem(snoozeKey);
    localStorage.removeItem(shownKey);
  };

  return {
    open,
    dismiss,
    remindTomorrow,
    disableTonight,
    disableForever,
    enableAgain,
  };
}
