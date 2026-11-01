"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { KartuHadiah } from "@/components/KartuHadiah";
import { Hasil } from "@/components/latihan/Hasil";
import { LayarMemuat } from "@/components/latihan/LayarMemuat";
import { Mengerjakan, type AkhirSesi } from "@/components/latihan/Mengerjakan";
import { FormSoal, nilaiAwal, type NilaiForm } from "@/components/markas/FormSoal";
import { KartuNaikKelas } from "@/components/markas/KartuNaikKelas";
import { Pengaturan } from "@/components/markas/Pengaturan";
import { Riwayat } from "@/components/markas/Riwayat";
import { SaranLatihan } from "@/components/markas/SaranLatihan";
import { LoadingCard, RequireLogin } from "@/components/RequireLogin";
import { ThemeBody } from "@/components/ThemeBody";
import { api, apiMessage, ApiFailure, dibatalkan } from "@/lib/api";
import { setDevicePlayer } from "@/lib/device";
import { fase, kelasShort, type Level } from "@/lib/kelas";
import { hitungSaran, tanpaAkhiranContoh, type Riwayat as BarisRiwayat, type Saran, type StatTopik } from "@/lib/latihan";
import type { Player } from "@/lib/player";
import type { Rewards } from "@/lib/rewards";
import type { PaketSesi } from "@/lib/soal";
import { WORLDS } from "@/lib/worlds";

export default function Markas() {
  return <RequireLogin>{() => <IsiMarkas />}</RequireLogin>;
}

type Layar =
  | { jenis: "markas" }
  | { jenis: "memuat" }
  | { jenis: "kerja"; paket: PaketSesi; awal: Rewards; nilai: NilaiForm | null }
  | { jenis: "hasil"; paket: PaketSesi; awal: Rewards; nilai: NilaiForm | null; hasil: AkhirSesi };

type Ringkasan = { riwayat: BarisRiwayat[]; topik: StatTopik[]; aiTersedia: boolean };

const keFormSoal = () =>
  requestAnimationFrame(() => document.getElementById("form-soal")?.scrollIntoView({ block: "start" }));

/** Markas pemain (brief 7.4) beserta layar memuat, mengerjakan, dan hasil (brief 7.5–7.7). */
function IsiMarkas() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pemain, setPemain] = useState<Player | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [nilai, setNilai] = useState<NilaiForm | null>(null);
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [layar, setLayar] = useState<Layar>({ jenis: "markas" });
  const pembatal = useRef<AbortController | null>(null);

  useEffect(() => {
    let hidup = true;
    api
      .getPlayer(id)
      .then((p) => {
        if (!hidup) return;
        setPemain(p);
        setNilai((n) => n ?? nilaiAwal(p.kelas));
      })
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

  const muatRingkasan = useCallback(() => {
    api
      .ringkasan(id)
      .then(setRingkasan)
      // Riwayat dan saran hanya pelengkap: kalau gagal, markas tetap bisa dipakai.
      .catch(() => setRingkasan((r) => r ?? { riwayat: [], topik: [], aiTersedia: true }));
  }, [id]);

  useEffect(() => {
    muatRingkasan();
  }, [muatRingkasan]);

  useEffect(() => () => pembatal.current?.abort(), []);

  function gantiPemain() {
    setDevicePlayer(null);
    router.push("/pemain");
  }

  function sesudahHapus() {
    setDevicePlayer(null);
    router.replace("/mulai");
  }

  async function mulai(sumber: { jenis: "ai"; nilai: NilaiForm } | { jenis: "contoh" }) {
    if (!pemain) return;
    const awal = pemain.rewards;
    if (sumber.jenis === "ai") setNilai(sumber.nilai);
    setGalatForm(null);
    setLayar({ jenis: "memuat" });
    window.scrollTo(0, 0);
    const c = new AbortController();
    pembatal.current = c;
    try {
      const paket =
        sumber.jenis === "ai"
          ? await api.buatSoal(
              {
                pemainId: pemain.id,
                mapel: sumber.nilai.mapel,
                topik: sumber.nilai.topik,
                level: sumber.nilai.level,
                n: Number(sumber.nilai.jumlah) as 5 | 10,
              },
              c.signal,
            )
          : await api.soalContoh(pemain.id, c.signal);
      if (c.signal.aborted) return;
      setLayar({ jenis: "kerja", paket, awal, nilai: sumber.jenis === "ai" ? sumber.nilai : null });
    } catch (e) {
      if (dibatalkan(e) || c.signal.aborted) return;
      setLayar({ jenis: "markas" });
      setGalatForm(apiMessage(e, "soal"));
      if (e instanceof ApiFailure && e.code === "ai_belum_siap") setRingkasan((r) => (r ? { ...r, aiTersedia: false } : r));
      keFormSoal();
    } finally {
      if (pembatal.current === c) pembatal.current = null;
    }
  }

  /** Batal dari layar memuat: kembali ke markas tanpa pesan (brief 10.5). */
  function batal() {
    pembatal.current?.abort();
    pembatal.current = null;
    setLayar({ jenis: "markas" });
    keFormSoal();
  }

  function keMarkas() {
    setLayar({ jenis: "markas" });
    muatRingkasan();
    window.scrollTo(0, 0);
  }

  function pilihSaran(s: Saran) {
    if (!nilai) return;
    setNilai({ ...nilai, mapel: s.mapel, topik: tanpaAkhiranContoh(s.topik), level: s.level });
    setGalatForm(null);
    keFormSoal();
  }

  const setRewards = useCallback((rewards: Rewards) => setPemain((p) => (p ? { ...p, rewards } : p)), []);

  if (galat)
    return (
      <main className="wrap">
        <p className="form-msg" role="alert">
          {galat}
        </p>
      </main>
    );
  if (!pemain || !nilai) return <LoadingCard />;

  const tema = <ThemeBody world={pemain.theme} />;

  if (layar.jenis === "memuat")
    return (
      <>
        {tema}
        <LayarMemuat dunia={pemain.theme} onBatal={batal} />
      </>
    );

  if (layar.jenis === "kerja")
    return (
      <>
        {tema}
        <Mengerjakan
          key={layar.paket.sesiId}
          pemainId={pemain.id}
          nama={pemain.name}
          dunia={pemain.theme}
          paket={layar.paket}
          awal={layar.awal}
          kini={pemain.rewards}
          onRewards={setRewards}
          onSelesai={(hasil) => setLayar({ ...layar, jenis: "hasil", hasil })}
          onKeluar={keMarkas}
        />
      </>
    );

  if (layar.jenis === "hasil") {
    const ulangi = (level?: Level) => {
      if (!layar.nilai) return keMarkas();
      muatRingkasan();
      mulai({ jenis: "ai", nilai: { ...layar.nilai, level: level ?? layar.nilai.level } });
    };
    return (
      <>
        {tema}
        <Hasil
          nama={pemain.name}
          dunia={pemain.theme}
          paket={layar.paket}
          awal={layar.awal}
          akhir={pemain.rewards}
          hasil={layar.hasil}
          onLevelBerikut={(l) => ulangi(l)}
          onSoalBaru={() => ulangi()}
          onMarkas={keMarkas}
        />
      </>
    );
  }

  return (
    <>
      {tema}
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
        <FormSoal
          pemain={pemain}
          nilai={nilai}
          onNilai={setNilai}
          galat={galatForm}
          onGalat={setGalatForm}
          onKirim={(n) => mulai({ jenis: "ai", nilai: n })}
          aiTersedia={ringkasan?.aiTersedia ?? true}
          onContoh={() => mulai({ jenis: "contoh" })}
        />
        <SaranLatihan saran={hitungSaran(ringkasan?.topik ?? [])} onPilih={pilihSaran} />
        <Riwayat daftar={ringkasan?.riwayat ?? null} />

        <Pengaturan pemain={pemain} onUbah={setPemain} onHapus={sesudahHapus} />
      </main>
    </>
  );
}
