"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
} from "firebase/auth";
import { firebaseConfig } from "./config";

let auth: Auth | null = null;

export function clientAuth(): Auth {
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.languageCode = "id";
  // Syarat ditulis langsung supaya terhapus dari build asli.
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1")
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  // Orang tua login sekali di HP anak, lalu tetap masuk.
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}

export async function signInWithGoogle(): Promise<void> {
  const a = clientAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(a, provider);
  } catch (e) {
    // Sebagian browser HP memblokir popup; pakai redirect sebagai cadangan.
    if ((e as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(a, provider);
      return;
    }
    throw e;
  }
}

/**
 * Lupa PIN admin: orang tua harus mengetik ulang akun Google-nya (prompt=login),
 * supaya anak yang memegang HP tidak bisa mereset PIN hanya dengan mengetuk akun.
 */
export async function loginUlangGoogle(): Promise<void> {
  const a = clientAuth();
  if (!a.currentUser) throw Object.assign(new Error("belum login"), { code: "auth/no-current-user" });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "login" });
  await reauthenticateWithPopup(a.currentUser, provider);
  await a.currentUser.getIdToken(true);
}

export function loginErrorMessage(e: unknown): string | null {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/unauthorized-domain")
    return "Alamat ini belum diizinkan untuk login. Tambahkan di Firebase: Authentication → Settings → Authorized domains.";
  if (code === "auth/user-mismatch") return "Akun Google yang dipilih berbeda. Pakai akun orang tua yang sama.";
  if (code === "auth/popup-blocked") return "Jendela login diblokir browser. Izinkan pop-up, lalu coba lagi.";
  if (code === "auth/network-request-failed") return "Koneksi terputus. Coba lagi.";
  return "Login belum berhasil. Coba lagi.";
}
