"use client";

import { SlotTulang } from "@/components/KartuHadiah";
import { MATERIAL, MATERIAL_WARNA, TULANG_PER_KERANGKA, dinoDigali, perjalanan, syaratBoss } from "@/lib/hadiah";
import type { Rewards } from "@/lib/rewards";
import type { WorldId } from "@/lib/worlds";

const NYAWA = 3;

/** Kartu HUD saat mengerjakan soal, sesuai dunia (brief 8.6). `awal` = hadiah sebelum sesi, `kini` = sesudah jawaban terakhir. */
export function HudDunia({
  dunia,
  awal,
  kini,
  benar,
  salah,
  n,
  kena,
}: {
  dunia: WorldId;
  awal: Rewards;
  kini: Rewards;
  benar: number;
  salah: number;
  n: number;
  /** Naik setiap serangan kena: memicu getaran HUD Pahlawan. */
  kena: number;
}) {
  if (dunia === "blok") {
    return (
      <section className="card" aria-label="Hasil tambang misi ini">
        <span className="eyebrow">Hasil tambang misi ini</span>
        <div className="inv">
          {MATERIAL.map((m) => (
            <div key={m}>
              <span className="sw" style={{ background: MATERIAL_WARNA[m] }} aria-hidden="true" />
              <b>+{kini.blok[m] - awal.blok[m]}</b>
              {m}
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (dunia === "pahlawan") {
    const perlu = syaratBoss(n);
    const sisa = Math.max(0, perlu - benar);
    const nyawa = Math.max(0, NYAWA - salah);
    return (
      <section key={kena} className={kena ? "card hit" : "card"} aria-label="Pertarungan boss">
        <div className="boss-row">
          <span>Boss Materi</span>
          <span>{sisa ? `${sisa} serangan lagi` : "Tumbang!"}</span>
        </div>
        <div className="hp" role="progressbar" aria-label="HP boss" aria-valuenow={Math.round((sisa / perlu) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${(sisa / perlu) * 100}%` }} />
        </div>
        <div className="boss-row">
          <span>HP kamu</span>
          <span className="hearts" role="img" aria-label={`${nyawa} dari ${NYAWA} hati`}>
            {"♥".repeat(nyawa) + "♡".repeat(NYAWA - nyawa)}
          </span>
        </div>
      </section>
    );
  }

  if (dunia === "antariksa") {
    const f = kini.antariksa.fuel;
    const p = perjalanan(f);
    return (
      <section className="card" aria-label="Perjalanan roket">
        <div className="split">
          <span className="eyebrow">{p.berikut ? `Menuju ${p.berikut.nama}` : "Ujung tata surya"}</span>
          <span className="muted small num">+{f - awal.antariksa.fuel} liter misi ini</span>
        </div>
        <div className="bar" role="progressbar" aria-label={p.berikut ? `Menuju ${p.berikut.nama}` : "Ujung tata surya"} aria-valuenow={p.persen} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${p.persen}%` }} />
        </div>
        <span className="muted small num">{p.berikut ? `${f}/${p.berikut.at} liter` : `${f} liter`}</span>
      </section>
    );
  }

  const total = (r: Rewards) => r.dino.done.length * TULANG_PER_KERANGKA + r.dino.bones;
  const kerangkaBaru = kini.dino.done.length - awal.dino.done.length;
  return (
    <section className="card" aria-label="Galian fosil">
      <div className="split">
        <span className="eyebrow">Menggali {dinoDigali(kini.dino).nama}</span>
        <span className="muted small num">+{total(kini) - total(awal)} tulang misi ini</span>
      </div>
      <SlotTulang terisi={kini.dino.bones} />
      {kerangkaBaru > 0 && <b>{kerangkaBaru} kerangka baru selesai!</b>}
    </section>
  );
}
