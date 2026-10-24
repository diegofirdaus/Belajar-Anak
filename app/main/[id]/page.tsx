"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingCard, RequireLogin } from "@/components/RequireLogin";
import { ThemeBody } from "@/components/ThemeBody";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { setDevicePlayer } from "@/lib/device";
import { fase, kelasShort } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import { WORLDS } from "@/lib/worlds";

// Sementara (tahap 3): kepala markas saja. Isi markas dibangun di tahap 5.
export default function Markas() {
  return <RequireLogin>{() => <MarkasSementara />}</RequireLogin>;
}

function MarkasSementara() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getPlayer(id)
      .then((p) => alive && setPlayer(p))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiFailure && e.code === "tidak_ditemukan") {
          setDevicePlayer(null);
          router.replace("/pemain");
        } else setErr(apiMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [id, router]);

  function gantiPemain() {
    setDevicePlayer(null);
    router.push("/pemain");
  }

  if (err)
    return (
      <main className="wrap">
        <p className="form-msg" role="alert">
          {err}
        </p>
      </main>
    );
  if (!player) return <LoadingCard />;

  return (
    <>
      <ThemeBody world={player.theme} />
      <main className="wrap">
        <header className="topbar">
          <div className="who">
            <p className="eyebrow">{WORLDS[player.theme].name}</p>
            <h1>{player.name}</h1>
            <p className="muted small">
              {kelasShort(player.kelas)} · Fase {fase(player.kelas)} Kurikulum Merdeka
            </p>
          </div>
          <button type="button" className="btn ghost small" onClick={gantiPemain}>
            Ganti pemain
          </button>
        </header>
        <div className="card">
          <h2>Markasmu sedang dibangun</h2>
          <p className="muted">Kartu hadiah, form membuat soal, dan riwayat latihan hadir di tahap 5.</p>
        </div>
      </main>
    </>
  );
}
