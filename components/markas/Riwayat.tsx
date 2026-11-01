"use client";

import { labelLevel, tanggalPendek, type Riwayat as BarisRiwayat } from "@/lib/latihan";

/** Riwayat latihan: 8 terakhir (brief 7.4 no. 6). `null` = masih dimuat. */
export function Riwayat({ daftar }: { daftar: BarisRiwayat[] | null }) {
  return (
    <section className="card" aria-labelledby="riwayat-judul">
      <h2 id="riwayat-judul">Riwayat latihan</h2>
      {daftar === null ? (
        <p className="muted">Memuat riwayat…</p>
      ) : daftar.length === 0 ? (
        <p className="muted">Belum ada latihan. Hasil latihan pertamamu akan muncul di sini.</p>
      ) : (
        <ul className="hist">
          {daftar.map((r) => (
            <li key={r.id}>
              <div className="hist-main">
                <b>{r.topik}</b>
                <span className="muted small">
                  {r.mapel} · {labelLevel(r.level)} · {tanggalPendek(r.waktu)}
                </span>
              </div>
              <span className="hist-score num" aria-label={`${r.benar} dari ${r.n} benar`}>
                {r.benar}/{r.n}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
