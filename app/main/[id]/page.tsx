"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KartuHadiah } from "@/components/KartuHadiah";
import { FormSoal } from "@/components/markas/FormSoal";
import { KartuNaikKelas } from "@/components/markas/KartuNaikKelas";
import { Pengaturan } from "@/components/markas/Pengaturan";
import { LoadingCard, RequireLogin } from "@/components/RequireLogin";
import { ThemeBody } from "@/components/ThemeBody";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { setDevicePlayer } from "@/lib/device";
import { fase, kelasShort } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import { WORLDS } from "@/lib/worlds";

export default function Markas() {
  return <RequireLogin>{() => <IsiMarkas />}</RequireLogin>;
}

/** Markas pemain (brief 7.4). */
function IsiMarkas() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pemain, setPemain] = useState<Player | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let hidup = true;
    api
      .getPlayer(id)
      .then((p) => hidup && setPemain(p))
      .catch((e) => {
        if (!hidup) return;
        if (e instanceof ApiFailure && e.code === "tidak_ditemukan") {
          setDevicePlayer(null);
          router.replace("/pemain");
        } else setGalat(apiMessage(e));
      });
    return () => {
      hidup = false;
    };
  }, [id, router]);

  function gantiPemain() {
    setDevicePlayer(null);
    router.push("/pemain");
  }

  function sesudahHapus() {
    setDevicePlayer(null);
    router.replace("/mulai");
  }

  if (galat)
    return (
      <main className="wrap">
        <p className="form-msg" role="alert">
          {galat}
        </p>
      </main>
    );
  if (!pemain) return <LoadingCard />;

  return (
    <>
      <ThemeBody world={pemain.theme} />
      <main className="wrap">
        <header className="topbar">
          <div className="who">
            <p className="eyebrow">{WORLDS[pemain.theme].name}</p>
            <h1>{pemain.name}</h1>
            <p className="muted small">
              {kelasShort(pemain.kelas)} · Fase {fase(pemain.kelas)} Kurikulum Merdeka
            </p>
          </div>
          <button type="button" className="btn ghost small" onClick={gantiPemain}>
            Ganti pemain
          </button>
        </header>

        <KartuNaikKelas pemain={pemain} onUbah={setPemain} />
        <KartuHadiah dunia={pemain.theme} hadiah={pemain.rewards} />
        <FormSoal key={pemain.kelas} pemain={pemain} />

        <section className="card" aria-labelledby="riwayat-judul">
          <h2 id="riwayat-judul">Riwayat latihan</h2>
          <p className="muted">Belum ada latihan. Hasil latihan pertamamu akan muncul di sini.</p>
        </section>

        <Pengaturan pemain={pemain} onUbah={setPemain} onHapus={sesudahHapus} />
      </main>
    </>
  );
}
