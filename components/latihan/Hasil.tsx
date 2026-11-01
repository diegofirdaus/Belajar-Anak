"use client";

import { useEffect, useRef } from "react";
import { LEVELS, nextLevel, type Level } from "@/lib/kelas";
import { labelLevel, persen, pesanHasil, ringkasHasil } from "@/lib/latihan";
import type { Rewards } from "@/lib/rewards";
import type { PaketSesi } from "@/lib/soal";
import type { WorldId } from "@/lib/worlds";
import type { AkhirSesi } from "./Mengerjakan";

/** Halaman hasil (brief 7.7). */
export function Hasil({
  nama,
  dunia,
  paket,
  awal,
  akhir,
  hasil,
  aiTersedia,
  onLevelBerikut,
  onSoalBaru,
  onMirip,
  onUlangiPilihan,
  onMarkas,
}: {
  nama: string;
  dunia: WorldId;
  paket: PaketSesi;
  awal: Rewards;
  akhir: Rewards;
  hasil: AkhirSesi;
  onLevelBerikut: (l: Level) => void;
  onSoalBaru: () => void;
  aiTersedia: boolean;
  onMirip: () => void;
  onUlangiPilihan: () => void;
  onMarkas: () => void;
}) {
  const { benar, n } = hasil;
  const pct = persen(benar, n);
  const r = ringkasHasil({ dunia, awal, akhir, benar, n, bossKalah: hasil.bossKalah });
  const berikut = LEVELS.includes(paket.level as Level) ? nextLevel(paket.level as Level) : null;
  const bisaNaik = paket.sumber === "ai" && pct >= 80 && berikut;
  const judul = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    judul.current?.focus({ preventScroll: true });
  }, []);

  return (
    <main className="wrap">
      <section className="card result" aria-labelledby="hasil-banner">
        <p id="hasil-banner" ref={judul} tabIndex={-1} className={r.menang ? "banner win" : "banner lose"}>
          {r.banner}
        </p>
        <p className="big" aria-label={`${benar} dari ${n} benar`}>
          {benar}/{n}
        </p>
        <p className="muted">
          {pct}% benar · {paket.topik} · {paket.level === "pilihan" ? "soal pilihan" : `level ${labelLevel(paket.level)}`}
        </p>
        {r.hadiah && <p className="reward-pop">{r.hadiah}</p>}
        {r.tambahan && <p className="extra">{r.tambahan}</p>}
        <p>{pesanHasil(nama, paket.level, benar, n)}</p>
      </section>

      <div className="res-actions">
        {paket.sumber === "ai" && (
          <>
            {bisaNaik && (
              <button type="button" className="btn" onClick={() => onLevelBerikut(berikut)}>
                Coba level {berikut}
              </button>
            )}
            <button type="button" className={bisaNaik ? "btn ghost" : "btn"} onClick={onSoalBaru}>
              Soal baru, level sama
            </button>
          </>
        )}
        {(paket.sumber === "set" || paket.sumber === "set_similar") && paket.setId && (
          <>
            {aiTersedia && (
              <button type="button" className="btn" onClick={onMirip}>
                Buat soal mirip (AI)
              </button>
            )}
            <button type="button" className={aiTersedia ? "btn ghost" : "btn"} onClick={onUlangiPilihan}>
              Ulangi soal pilihan ini
            </button>
          </>
        )}
        <button type="button" className="btn ghost" onClick={onMarkas}>
          Kembali ke markas
        </button>
      </div>
    </main>
  );
}
