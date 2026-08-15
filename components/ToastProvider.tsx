"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let idCounter = 0;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, kind, message }]);
    // Auto-dismiss, but the popup nature (not an inline line of text) means
    // it can't be scrolled past or missed while it's up.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const kindStyles: Record<ToastKind, string> = {
    success: "border-ezgold/60 bg-ezblacksoft text-ezgold",
    error: "border-ezred/60 bg-ezblacksoft text-ezred",
    info: "border-zinc-700 bg-ezblacksoft text-zinc-200",
  };

  const kindIcon: Record<ToastKind, string> = {
    success: "🎉",
    error: "⚠️",
    info: "ℹ️",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed inset-x-0 top-4 sm:top-6 z-[100] flex flex-col items-center gap-2 px-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-start gap-3 animate-toast-in ${kindStyles[t.kind]}`}
          >
            <span className="text-lg leading-none shrink-0">{kindIcon[t.kind]}</span>
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-500 hover:text-zinc-200 text-sm leading-none shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
