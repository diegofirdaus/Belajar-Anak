"use client";

import type { Saran } from "@/lib/latihan";

/** Saran latihan (brief 7.4 no. 5, 9.2). Chip mengisi form otomatis. Tidak tampil kalau belum ada saran. */
export function SaranLatihan({ saran, onPilih }: { saran: Saran[]; onPilih: (s: Saran) => void }) {
  if (!saran.length) return null;
  return (
    <section className="card" aria-labelledby="saran-judul">
      <h2 id="saran-judul">Saran latihan</h2>
      <div className="chips">
        {saran.map((s) => (
          <button key={`${s.jenis}-${s.mapel}-${s.topik}-${s.level}`} type="button" className={`chip ${s.jenis}`} onClick={() => onPilih(s)}>
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
