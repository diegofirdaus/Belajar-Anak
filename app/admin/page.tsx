"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DaftarPaket } from "@/components/admin/DaftarPaket";
import { DataKeluarga } from "@/components/admin/DataKeluarga";
import { ProgresAnak } from "@/components/admin/ProgresAnak";
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

type Layar =
  | { jenis: "pin" }
  | { jenis: "ganti-pin" }
  | { jenis: "progres" }
  | { jenis: "daftar" }
  | { jenis: "pengaturan" }
  | { jenis: "editor"; paket: PaketPilihan | null };

const JUDUL: Record<Layar["jenis"], string> = {
  pin: "Masuk mode admin",
  "ganti-pin": "Ganti PIN admin",
  progres: "Progres anak",
  daftar: "Soal pilihan",
  pengaturan: "Pengaturan admin",
  editor: "Tambah soal pilihan",
};

const TAB: { jenis: "progres" | "daftar" | "pengaturan"; label: string }[] = [
  { jenis: "progres", label: "Progres anak" },
  { jenis: "daftar", label: "Soal pilihan" },
  { jenis: "pengaturan", label: "Pengaturan" },
];

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
    setLayar({ jenis: "progres" });
    window.scrollTo(0, 0);
  }

  function bukaTab(jenis: "progres" | "daftar" | "pengaturan") {
    setLayar({ jenis });
    if (jenis === "daftar" && sesi) muatPaket(sesi);
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

      {sesi && (layar.jenis === "progres" || layar.jenis === "daftar" || layar.jenis === "pengaturan") && (
        <nav className="seg tabs" aria-label="Menu mode admin">
          {TAB.map((t) => (
            <button
              key={t.jenis}
              type="button"
              className="tab"
              aria-current={layar.jenis === t.jenis ? "page" : undefined}
              onClick={() => bukaTab(t.jenis)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {layar.jenis === "pin" && (
        <GerbangPin
          key={status.adaPin ? "masuk" : "buat"}
          buat={!status.adaPin}
          onMasuk={masuk}
          onPinDihapus={() => setStatus((s) => (s ? { ...s, adaPin: false } : s))}
        />
      )}
      {layar.jenis === "ganti-pin" && sesi && (
        <GerbangPin
          buat
          ganti
          sesi={sesi}
          onMasuk={(token) => {
            setSesi(token);
            bukaTab("pengaturan");
          }}
          onPinDihapus={() => {}}
          onBatal={() => bukaTab("pengaturan")}
        />
      )}
      {layar.jenis === "daftar" && (
        <DaftarPaket
          paket={paket}
          onTambah={() => setLayar({ jenis: "editor", paket: null })}
          onUbah={(p) => setLayar({ jenis: "editor", paket: p })}
          onHapus={hapus}
        />
      )}
      {layar.jenis === "progres" && sesi && <ProgresAnak sesi={sesi} onSesiHabis={sesiHabis} />}
      {layar.jenis === "pengaturan" && sesi && (
        <>
          <section className="card" aria-labelledby="pin-judul">
            <h2 id="pin-judul">PIN admin</h2>
            <p className="muted small">PIN dipakai untuk membuka mode admin. Jangan beri tahu anak-anak, ya.</p>
            <button type="button" className="btn ghost small" onClick={() => setLayar({ jenis: "ganti-pin" })}>
              Ganti PIN admin
            </button>
          </section>
          <DataKeluarga sesi={sesi} onSesiHabis={sesiHabis} onDihapus={() => router.replace("/")} />
        </>
      )}
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
