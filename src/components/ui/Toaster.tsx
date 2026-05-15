// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Global toast notifications
//  Phase 3 extraction.
//
//  Usage:
//    const toast = useToast();
//    toast.success("Saved!");
//    toast.error("Failed");
//    toast.info("…");
//
//  The <Toaster/> component must be rendered once at the app root. It exposes
//  a global handle via Toaster._add so any component (including non-React
//  utility functions like drainOfflineQueue) can push a toast without going
//  through React context.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; msg: string; type: ToastType; }

// Static handle that the rendered Toaster registers itself onto on mount.
interface ToasterFn extends React.FC {
  _add?: (msg: string, type?: ToastType) => void;
}

export const Toaster: ToasterFn = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  // Expose globally so any code (incl. plain JS utilities) can fire toasts.
  Toaster._add = add;

  const icons: Record<ToastType, string> = { success: "✓", error: "✕", info: "ℹ" };
  const styles: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    error:   { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
    info:    { bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
  };

  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const s = styles[t.type] || styles.success;
        return (
          <div key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold pointer-events-auto animate-fade-in"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, minWidth: 240, maxWidth: 360 }}>
            <span className="text-base leading-none">{icons[t.type]}</span>
            <span className="flex-1">{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
};

export function useToast() {
  return {
    success: (msg: string) => Toaster._add && Toaster._add(msg, "success"),
    error:   (msg: string) => Toaster._add && Toaster._add(msg, "error"),
    info:    (msg: string) => Toaster._add && Toaster._add(msg, "info"),
  };
}
