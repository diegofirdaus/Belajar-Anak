"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast((t) => ({ id: (t?.id ?? 0) + 1, msg }));
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            {toast.msg}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
