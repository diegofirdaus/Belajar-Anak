"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DaftarPaket } from "@/components/admin/DaftarPaket";
import { DataKeluarga } from "@/components/admin/DataKeluarga";
import { EditorPaket } from "@/components/admin/EditorPaket";
import { GerbangPin } from "@/components/admin/GerbangPin";
import { Pipo } from "@/components/Pipo";
import { LoadingCard, RequireLogin } from "@/components/RequireLogin";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { getDevicePlayer } from "@/lib/device";
import type { PaketPilihan } from "@/lib/soalPilihan";

export default function Admin() {
  return <RequireLogin>{() => <ModeAdmin />}</RequireLogin>;
}

type Layar = { jenis: "pin" } | { jenis: "ganti-pin" } | { jenis: "daftar" } | { jenis: "editor"; paket: PaketPilihan | null };

const JUDUL: Record<Layar["jenis"], string> = {
  pin: "Masuk mode admin",
  "ganti-pin": "Ganti PIN admin",
  daftar: "Soal pilihan",
  editor: "Tambah soal pilihan",
};

/**
 * Mode admin (brief 7.8). Sesi admin hanya disimpan di memori halaman:
 * setiap kali mode admin dibuka, PIN diminta lagi.
 */
function ModeAdmin() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<{ adaPin: boolean; aiTersedia: boolean } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sesi, setSesi] = useState<string | null>(null);
  const [layar, setLayar] = useState<Layar>({ jenis: "pin" });
  const [paket, setPaket] = useState<PaketPilihan[] | null>(null);
  const [kelasAwal, setKelasAwal] = useState(5);

  useEffect(() => {
    api
      .statusAdmin()
      .then((s) => setStatus({ adaPin: s.adaPin, aiTersedia: s.aiTersedia }))
      .catch((e) => setGalat(apiMessage(e)));
    // Kelas bawaan editor mengikuti pemain yang memakai HP ini.
    const pid = getDevicePlayer();
    if (pid)
      api
        .getPlayer(pid)
        .then((p) => setKelasAwal(p.kelas))
        .catch(() => {});
  }, []);

  const sesiHabis = useCallback(() => {
    setSesi(null);
    setPaket(null);
    setLayar({ jenis: "pin" });
    toast("Sesi mode admin sudah habis. Masukkan PIN lagi.");
  }, [toast]);

  const muatPaket = useCallback(
    (token: string) => {
      setPaket(null);
      api
        .daftarPaket(token)
        .then(setPaket)
        .catch((e) => {
          if (e instanceof ApiFailure && e.code === "admin_perlu") sesiHabis();
          else {
            setPaket([]);
            toast(apiMessage(e));
          }
        });
    },
    [sesiHabis, toast],
  );

  function masuk(token: string) {
    setSesi(token);
    setStatus((s) => (s ? { ...s, adaPin: true } : s));
    setLayar({ jenis: "daftar" });
    muatPaket(token);
    window.scrollTo(0, 0);
  }

  function keluar() {
    if (sesi) api.keluarAdmin(sesi).catch(() => {});
    const pid = getDevicePlayer();
    router.push(pid ? `/main/${pid}` : "/pemain");
  }

  async function hapus(p: PaketPilihan) {
    if (!sesi) return;
    try {
      await api.hapusPaket(sesi, p.id);
      setPaket((d) => d?.filter((x) => x.id !== p.id) ?? d);
      toast("Soal pilihan dihapus.");
    } catch (e) {
      if (e instanceof ApiFailure && e.code === "admin_perlu") sesiHabis();
      else toast(apiMessage(e));
    }
  }

  function keDaftar() {
    setLayar({ jenis: "daftar" });
    if (sesi) muatPaket(sesi);
    window.scrollTo(0, 0);
  }

  if (galat)
    return (
      <main className="wrap">
        <p className="form-msg" role="alert">
          {galat}
        </p>
      </main>
    );
  if (!status) return <LoadingCard />;

  const judul = layar.jenis === "editor" && layar.paket ? "Ubah soal pilihan" : JUDUL[layar.jenis];

  return (
    <main className="wrap">
      <header className="screen-head">
        <Pipo />
        <div className="grow">
          <span className="admin-badge">Mode admin</span>
          <h1>{judul}</h1>
        </div>
        <button type="button" className="btn ghost small" onClick={keluar}>
          Keluar
        </button>
      </header>

      {layar.jenis === "pin" && (
        <GerbangPin
          key={status.adaPin ? "masuk" : "buat"}
          buat={!status.adaPin}
          onMasuk={masuk}
          onPinDihapus={() => setStatus((s) => (s ? { ...s, adaPin: false } : s))}
        />
      )}
      {layar.jenis === "ganti-pin" && sesi && (
        <GerbangPin buat ganti sesi={sesi} onMasuk={masuk} onPinDihapus={() => {}} onBatal={keDaftar} />
      )}
      {layar.jenis === "daftar" && (
        <DaftarPaket
          paket={paket}
          onTambah={() => setLayar({ jenis: "editor", paket: null })}
          onUbah={(p) => setLayar({ jenis: "editor", paket: p })}
          onHapus={hapus}
          onGantiPin={() => setLayar({ jenis: "ganti-pin" })}
        />
      )}
      {layar.jenis === "daftar" && sesi && <DataKeluarga sesi={sesi} onSesiHabis={sesiHabis} onDihapus={() => router.replace("/")} />}
      {layar.jenis === "editor" && sesi && (
        <EditorPaket
          key={layar.paket?.id ?? "baru"}
          sesi={sesi}
          paket={layar.paket}
          kelasAwal={kelasAwal}
          aiTersedia={status.aiTersedia}
          onSelesai={keDaftar}
          onBatal={keDaftar}
          onSesiHabis={sesiHabis}
        />
      )}
    </main>
  );
}
