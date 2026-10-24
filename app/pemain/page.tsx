"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Pipo } from "@/components/Pipo";
import { RequireLogin } from "@/components/RequireLogin";
import { WorldArt } from "@/components/WorldArt";
import { api, apiMessage } from "@/lib/api";
import { setDevicePlayer } from "@/lib/device";
import { kelasShort } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import { WORLDS } from "@/lib/worlds";

export default function Pemain() {
  return <RequireLogin>{(user) => <DaftarPemain user={user} />}</RequireLogin>;
}

function DaftarPemain({ user }: { user: User }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .listPlayers()
      .then((p) => alive && setPlayers(p))
      .catch((e) => alive && setErr(apiMessage(e)));
    return () => {
      alive = false;
    };
  }, []);

  function pilih(p: Player) {
    setDevicePlayer(p.id);
    router.push(`/main/${p.id}`);
  }

  return (
    <main className="wrap">
      <header className="screen-head">
        <Pipo size="lg" />
        <div className="grow">
          <p className="eyebrow">Markas Latihan</p>
          <h1>Siapa yang mau main?</h1>
        </div>
      </header>

      {err && (
        <p className="form-msg" role="alert">
          {err}
        </p>
      )}

      <div className="pl-list" aria-busy={players === null}>
        {players === null && !err && <p className="muted">Memuat pemain…</p>}
        {players?.map((p) => (
          <button key={p.id} type="button" className="pl-card" onClick={() => pilih(p)}>
            <WorldArt world={p.theme} mini />
            <span className="pl-info">
              <b>{p.name}</b>
              <span className="muted small">
                {kelasShort(p.kelas)} · {WORLDS[p.theme].name}
              </span>
            </span>
          </button>
        ))}
        {players?.length === 0 && (
          <p className="muted">Belum ada pemain. Tekan &quot;Pemain baru&quot; untuk berkenalan dengan Pipo.</p>
        )}
        <Link href="/kenalan" className="pl-add" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
          + Pemain baru
        </Link>
      </div>

      <p className="muted small">Tersimpan di akun {user.email ?? "orang tua"}.</p>

      <div className="links-col">
        <Link className="linkbtn" href="/">
          Kembali ke halaman pembuka
        </Link>
        <Link className="linkbtn" href="/admin">
          Mode admin (untuk orang tua)
        </Link>
        <button type="button" className="linkbtn" onClick={() => logout().then(() => router.replace("/"))}>
          Keluar dari akun orang tua
        </button>
      </div>
    </main>
  );
}
