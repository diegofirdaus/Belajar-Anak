"use client";

import { useId, type FormEvent } from "react";
import { Segment } from "@/components/Segment";
import { MAPEL, TOPIC_PLACEHOLDER, jenjangOf, type Level } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import type { PaketRingkas } from "@/lib/soalPilihan";
import { WORLDS } from "@/lib/worlds";

type LevelForm = Level | "pilihan";
const LEVEL_OPSI: { value: LevelForm; label: string; wide?: boolean }[] = [
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
];
const OPSI_PILIHAN = { value: "pilihan" as const, label: "★ Soal pilihan", wide: true };

export type NilaiForm = { mapel: string; topik: string; level: LevelForm; jumlah: "5" | "10" };

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
  paketPilihan,
  onKerjakan,
  onMirip,
}: {
  pemain: Player;
  nilai: NilaiForm;
  onNilai: (n: NilaiForm) => void;
  galat: string | null;
  onGalat: (g: string | null) => void;
  onKirim: (n: NilaiForm) => void;
  aiTersedia: boolean;
  onContoh: () => void;
  /** Soal pilihan untuk kelas pemain ini. */
  paketPilihan: PaketRingkas[];
  onKerjakan: (setId: string) => void;
  onMirip: (setId: string) => void;
}) {
  const id = useId();
  const j = jenjangOf(pemain.kelas);
  const mapel = mapelAktif(pemain.kelas, nilai.mapel);
  const w = WORLDS[pemain.theme];
  const ubah = (u: Partial<NilaiForm>) => onNilai({ ...nilai, mapel, ...u });
  const adaPilihan = paketPilihan.length > 0;
  // Kalau paket terakhir dihapus orang tua, kembali ke level mudah.
  const level: LevelForm = nilai.level === "pilihan" && !adaPilihan ? "mudah" : nilai.level;
  const modePilihan = level === "pilihan";
  const paketMapel = paketPilihan.filter((p) => p.subject === mapel);
  const mapelLain = [...new Set(paketPilihan.map((p) => p.subject))].filter((m) => m !== mapel);

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (modePilihan) return;
    if (!nilai.topik.trim()) {
      onGalat('Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak".');
      return;
    }
    onGalat(null);
    onKirim({ ...nilai, mapel, level });
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
        {!modePilihan && (
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
        )}
        <Segment
          label="Level"
          options={adaPilihan ? [...LEVEL_OPSI, OPSI_PILIHAN] : LEVEL_OPSI}
          value={level}
          onChange={(l) => {
            ubah({ level: l });
            onGalat(null);
          }}
        />
        {!modePilihan && (
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
        )}
        {modePilihan && (
          <div className="stack-6" role="group" aria-labelledby={`${id}-paket`}>
            <span className="flabel" id={`${id}-paket`}>
              Pilih paket soal
            </span>
            {paketMapel.length ? (
              <div className="set-list">
                {paketMapel.map((p) => (
                  <div key={p.id} className="set-card">
                    <b>{p.title}</b>
                    <span className="muted small">
                      {p.n} soal · {p.subject}
                    </span>
                    <div className="row-btns">
                      <button type="button" className="btn small" onClick={() => onKerjakan(p.id)}>
                        Kerjakan
                      </button>
                      <button type="button" className="btn ghost small" disabled={!aiTersedia} onClick={() => onMirip(p.id)}>
                        Buat soal mirip (AI)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="muted small">Belum ada soal pilihan untuk {mapel}. Ada soal pilihan untuk pelajaran ini:</p>
                <div className="chips">
                  {mapelLain.map((m) => (
                    <button key={m} type="button" className="chip" onClick={() => ubah({ mapel: m })}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        {!modePilihan && (
          <button type="submit" className="btn">
            {w.startLabel}
          </button>
        )}
        {!aiTersedia && !modePilihan && (
          <button type="button" className="btn ghost" onClick={onContoh}>
            Coba soal contoh
          </button>
        )}
      </form>
    </section>
  );
}
