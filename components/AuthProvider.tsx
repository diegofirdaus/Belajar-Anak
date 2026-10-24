"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clientAuth } from "@/lib/firebase/client";
import { setDevicePlayer } from "@/lib/device";

type AuthState = { status: "loading" } | { status: "out" } | { status: "in"; user: User };

const Ctx = createContext<{ state: AuthState; logout: () => Promise<void> }>({
  state: { status: "loading" },
  logout: async () => {},
});

export function useAuth() {
  return useContext(Ctx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const auth = clientAuth();
    // Menyelesaikan login cadangan lewat redirect, kalau ada.
    getRedirectResult(auth).catch(() => {});
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1") {
      // Hanya di build emulator (dihapus dari build asli): login Google tiruan untuk uji otomatis.
      (window as unknown as Record<string, unknown>).__masukUji = (email: string) =>
        signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })));
    }
    return onAuthStateChanged(auth, (user) => setState(user ? { status: "in", user } : { status: "out" }));
  }, []);

  const logout = useCallback(async () => {
    setDevicePlayer(null);
    await signOut(clientAuth());
  }, []);

  return <Ctx.Provider value={{ state, logout }}>{children}</Ctx.Provider>;
}
