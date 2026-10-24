"use client";

import { useEffect, useState } from "react";
import { Pipo } from "@/components/Pipo";

type Hasil = { ok: boolean; masalah?: string; pesan: string };

/** Pemeriksaan sambungan server ↔ Firebase yang tampil sebagai halaman biasa (bukan unduhan JSON di Safari). */
export default function Sehat() {
  const [hasil, setHasil] = useState<Hasil | null>(null);

  useEffect(() => {
    fetch("/api/sehat", { cache: "no-store" })
      .then((r) => r.json() as Promise<Hasil>)
      .then(setHasil)
      .catch(() => setHasil({ ok: false, masalah: "jaringan", pesan: "Server tidak menjawab. Cek status deploy di Vercel." }));
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
          </>
        )}
      </div>
    </main>
  );
}
