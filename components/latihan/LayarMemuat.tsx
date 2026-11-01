"use client";

import { useEffect, useRef, useState } from "react";
import { WORLDS, type WorldId } from "@/lib/worlds";

/** Layar memuat soal (brief 7.5): judul berganti tiap 2,6 detik, tombol Batal membatalkan permintaan. */
export function LayarMemuat({ dunia, onBatal }: { dunia: WorldId; onBatal: () => void }) {
  const teks = WORLDS[dunia].loadingTexts;
  const [i, setI] = useState(0);
  const batal = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setInterval(() => setI((k) => (k + 1) % teks.length), 2600);
    return () => clearInterval(t);
  }, [teks.length]);

  useEffect(() => {
    batal.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="wrap">
      <div className="card loading" role="status" aria-label="Menyiapkan soal">
        <div className="spinner" aria-hidden="true" />
        <h2 aria-hidden="true">{teks[i]}</h2>
        <p className="muted">Biasanya butuh 10–40 detik.</p>
        <button ref={batal} type="button" className="btn ghost small" onClick={onBatal}>
          Batal
        </button>
      </div>
    </main>
  );
}
