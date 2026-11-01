"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { loginErrorMessage, signInWithGoogle } from "@/lib/firebase/client";
import { useAuth } from "./AuthProvider";
import { Pipo } from "./Pipo";

export function LoadingCard({ text = "Memuat…" }: { text?: string }) {
  return (
    <main className="wrap">
      <div className="card loading" role="status">
        <div className="spinner" aria-hidden="true" />
        <p className="muted">{text}</p>
      </div>
    </main>
  );
}

function LoginCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setMsg(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setMsg(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <header className="screen-head">
        <Pipo size="lg" />
        <div className="grow">
          <p className="eyebrow">Untuk orang tua</p>
          <h1>Masuk dulu, ya</h1>
        </div>
      </header>
      <div className="card">
        <p>
          Orang tua cukup masuk sekali di HP ini. Setelah itu anak bisa langsung main tanpa login lagi.
        </p>
        <button type="button" className="btn" onClick={login} disabled={busy}>
          {busy ? "Membuka Google…" : "Masuk dengan Google"}
        </button>
        {msg && (
          <p className="form-msg" role="alert">
            {msg}
          </p>
        )}
        <p className="muted small">
          Markas Latihan hanya menyimpan nama panggilan dan kelas anak. Tanpa nama lengkap, sekolah, foto, atau lokasi.
        </p>
      </div>
      <Link className="linkbtn" href="/">
        Kembali ke halaman pembuka
      </Link>
    </main>
  );
}

/** Menampilkan isi hanya kalau orang tua sudah login. */
export function RequireLogin({ children }: { children: (user: User) => React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === "loading") return <LoadingCard />;
  if (state.status === "out") return <LoginCard />;
  return <>{children(state.user)}</>;
}
