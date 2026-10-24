"use client";

import { useEffect, useState } from "react";
import { Pipo } from "@/components/Pipo";

type Hasil = { ok: boolean; masalah?: string; pesan: string; detail?: string };

/** Pemeriksaan sambungan server ↔ Firebase yang tampil sebagai halaman biasa (bukan unduhan JSON di Safari). */
export default function Sehat() {
  const [hasil, setHasil] = useState<Hasil | null>(null);

  useEffect(() => {
    fetch("/api/sehat", { cache: "no-store" })
      .then(async (r) => {
        const teks = await r.text();
        try {
          setHasil(JSON.parse(teks) as Hasil);
        } catch {
          // Bukan jawaban dari kode kita (mis. halaman error Vercel): tampilkan apa adanya untuk diagnosis.
          setHasil({
            ok: false,
            masalah: "fungsi_server",
            pesan: "Fungsi server tidak berjalan. Kirim isi kotak di bawah ke pengembang.",
            detail: `HTTP ${r.status} · ${r.headers.get("x-vercel-error") ?? "-"} · ${r.headers.get("x-vercel-id") ?? "-"}\n${teks.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)}`,
          });
        }
      })
      .catch((e) =>
        setHasil({ ok: false, masalah: "jaringan", pesan: "Tidak ada jawaban sama sekali dari server.", detail: String(e) }),
      );
  }, []);

  return (
    <main className="wrap">
      <header className="screen-head">
        <Pipo size="lg" />
        <div className="grow">
          <p className="eyebrow">Pemeriksaan server</p>
          <h1>Sambungan Firebase</h1>
        </div>
      </header>
      <div className={hasil ? (hasil.ok ? "card fb" : "card fb bad") : "card"} role="status">
        {!hasil && <p className="muted">Memeriksa… (paling lama 10 detik)</p>}
        {hasil && (
          <>
            <h3>{hasil.ok ? "Beres!" : "Ada masalah"}</h3>
            <p>{hasil.pesan}</p>
            {hasil.masalah && <p className="muted small">Kode: {hasil.masalah}</p>}
            {hasil.detail && (
              <pre className="note" style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: ".8rem" }}>
                {hasil.detail}
              </pre>
            )}
          </>
        )}
      </div>
    </main>
  );
}
