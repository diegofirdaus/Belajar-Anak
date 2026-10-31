"use client";

import { useId, useState, type FormEvent } from "react";
import { Segment } from "@/components/Segment";
import { useToast } from "@/components/Toast";
import { api, apiMessage } from "@/lib/api";
import { MAPEL, TOPIC_PLACEHOLDER, jenjangOf, type Level } from "@/lib/kelas";
import type { Player } from "@/lib/player";
import { WORLDS } from "@/lib/worlds";

const LEVEL_OPSI: { value: Level; label: string }[] = [
  { value: "mudah", label: "Mudah" },
  { value: "sedang", label: "Sedang" },
  { value: "sulit", label: "Sulit" },
];

/** Form membuat soal di markas (brief 7.4 no. 4). */
export function FormSoal({ pemain }: { pemain: Player }) {
  const id = useId();
  const toast = useToast();
  const j = jenjangOf(pemain.kelas);
  const daftarMapel = MAPEL[j];
  const [mapel, setMapel] = useState(daftarMapel[0]);
  const [topik, setTopik] = useState("");
  const [level, setLevel] = useState<Level>("mudah");
  const [jumlah, setJumlah] = useState<"5" | "10">("5");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyiapkan, setMenyiapkan] = useState(false);
  // Kelas bisa berubah lewat Pengaturan; kalau mapel lama tidak ada di jenjang baru, pakai yang pertama.
  const mapelAktif = daftarMapel.includes(mapel) ? mapel : daftarMapel[0];
  const w = WORLDS[pemain.theme];

  async function kirim(e: FormEvent) {
    e.preventDefault();
    if (!topik.trim()) {
      setGalat('Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak".');
      return;
    }
    setGalat(null);
    setMenyiapkan(true);
    try {
      const sesi = await api.buatSoal({ pemainId: pemain.id, mapel: mapelAktif, topik, level, n: Number(jumlah) as 5 | 10 });
      // Layar memuat dan mengerjakan soal dibangun di tahap 7.
      toast(`${sesi.soal.length} soal siap! Layar mengerjakan soal hadir di tahap 7.`);
    } catch (err) {
      setGalat(apiMessage(err));
    } finally {
      setMenyiapkan(false);
    }
  }

  return (
    <section className="card" aria-labelledby={`${id}-judul`} id="form-soal">
      <h2 id={`${id}-judul`}>{w.formTitle}</h2>
      <form className="stack-12" onSubmit={kirim} noValidate>
        <div className="field">
          <label htmlFor={`${id}-mapel`}>Mata pelajaran</label>
          <select id={`${id}-mapel`} value={mapelAktif} onChange={(e) => setMapel(e.target.value)}>
            {daftarMapel.map((m) => (
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
            value={topik}
            onChange={(e) => setTopik(e.target.value)}
            enterKeyHint="go"
          />
        </div>
        <Segment label="Level" options={LEVEL_OPSI} value={level} onChange={setLevel} />
        <Segment
          label="Jumlah soal"
          columns={2}
          options={[
            { value: "5", label: "5 soal" },
            { value: "10", label: "10 soal" },
          ]}
          value={jumlah}
          onChange={setJumlah}
        />
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        <button type="submit" className="btn" disabled={menyiapkan}>
          {menyiapkan ? w.loadingTexts[0] : w.startLabel}
        </button>
      </form>
    </section>
  );
}
