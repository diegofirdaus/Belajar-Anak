"use client";

import { useId, type FormEvent } from "react";
import { Segment } from "@/components/Segment";
import { MAPEL, TOPIC_PLACEHOLDER, jenjangOf, type Level } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import { WORLDS } from "@/lib/worlds";

const LEVEL_OPSI: { value: Level; label: string }[] = [
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
];

export type NilaiForm = { mapel: string; topik: string; level: Level; jumlah: "5" | "10" };

export const nilaiAwal = (kelas: number): NilaiForm => ({
  mapel: MAPEL[jenjangOf(kelas)][0],
  topik: "",
  level: "mudah",
  jumlah: "5",
});

/** Mapel yang dipakai: kalau kelas berubah dan mapel lama tidak ada di jenjang baru, pakai yang pertama. */
export const mapelAktif = (kelas: number, mapel: string) => {
  const daftar = MAPEL[jenjangOf(kelas)];
  return daftar.includes(mapel) ? mapel : daftar[0];
};

/**
 * Form membuat soal di markas (brief 7.4 no. 4). Nilainya disimpan di halaman markas,
 * supaya tetap ada saat kembali dari layar memuat dan bisa diisi oleh chip saran.
 */
export function FormSoal({
  pemain,
  nilai,
  onNilai,
  galat,
  onGalat,
  onKirim,
  aiTersedia,
  onContoh,
}: {
  pemain: Player;
  nilai: NilaiForm;
  onNilai: (n: NilaiForm) => void;
  galat: string | null;
  onGalat: (g: string | null) => void;
  onKirim: (n: NilaiForm) => void;
  aiTersedia: boolean;
  onContoh: () => void;
}) {
  const id = useId();
  const j = jenjangOf(pemain.kelas);
  const mapel = mapelAktif(pemain.kelas, nilai.mapel);
  const w = WORLDS[pemain.theme];
  const ubah = (u: Partial<NilaiForm>) => onNilai({ ...nilai, mapel, ...u });

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (!nilai.topik.trim()) {
      onGalat('Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak".');
      return;
    }
    onGalat(null);
    onKirim({ ...nilai, mapel });
  }

  return (
    <section className="card" aria-labelledby={`${id}-judul`} id="form-soal">
      <h2 id={`${id}-judul`}>{w.formTitle}</h2>
      <form className="stack-12" onSubmit={kirim} noValidate>
        <div className="field">
          <label htmlFor={`${id}-mapel`}>Mata pelajaran</label>
          <select id={`${id}-mapel`} value={mapel} onChange={(e) => ubah({ mapel: e.target.value })}>
            {MAPEL[j].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-topik`}>Materi atau tema</label>
          <input
            id={`${id}-topik`}
            className="input"
            type="text"
            maxLength={120}
            placeholder={TOPIC_PLACEHOLDER[j]}
            value={nilai.topik}
            onChange={(e) => ubah({ topik: e.target.value })}
            enterKeyHint="go"
          />
        </div>
        <Segment label="Level" options={LEVEL_OPSI} value={nilai.level} onChange={(level) => ubah({ level })} />
        <Segment
          label="Jumlah soal"
          columns={2}
          options={[
            { value: "5", label: "5 soal" },
            { value: "10", label: "10 soal" },
          ]}
          value={nilai.jumlah}
          onChange={(jumlah) => ubah({ jumlah })}
        />
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        <button type="submit" className="btn">
          {w.startLabel}
        </button>
        {!aiTersedia && (
          <button type="button" className="btn ghost" onClick={onContoh}>
            Coba soal contoh
          </button>
        )}
      </form>
    </section>
  );
}
