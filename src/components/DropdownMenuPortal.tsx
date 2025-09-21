// src/components/DropdownMenuPortal.tsx
import React from "react";
import { createPortal } from "react-dom";

export default function DropdownMenuPortal({
  anchorRef,
  open,
  onClose,
  widthMatch = true,
  offsetY = 8,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  onClose?: () => void;
  widthMatch?: boolean;
  offsetY?: number;
  children: React.ReactNode;
}) {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setStyle({
      position: "fixed",
      top: rect.bottom + offsetY,
      left: rect.left,
      width: widthMatch ? rect.width : undefined,
      zIndex: 1000,
    });
  }, [open, anchorRef, widthMatch, offsetY]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = anchorRef.current;
      const menu = document.getElementById("__portal_dropdown_account");
      if (!menu || !el) return;
      const insideAnchor = el.contains(e.target as Node);
      const insideMenu = menu.contains(e.target as Node);
      if (!insideAnchor && !insideMenu) onClose?.();
    };
    window.addEventListener("mousedown", onDown, true);
    return () => window.removeEventListener("mousedown", onDown, true);
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      id="__portal_dropdown_account"
      style={style}
      className="rounded-2xl border border-white/15 bg-black/40 backdrop-blur-xl p-2 text-sm space-y-1 shadow-2xl"
    >
      {children}
    </div>,
    document.body
  );
}
