"use client";

import { useId, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { JENJANG_INFO, MAPEL, jenjangOf, kelasInJenjang, kelasShort, type Jenjang } from "@/lib/kelas";
import {
  JUDUL_MAKS,
  TEKS_ADMIN_MAKS,
  bacaManual,
  judulBawaan,
  type PaketPilihan,
  type SoalPilihan,
} from "@/lib/soalPilihan";

const HURUF = "ABCD";
const kurangiGerak = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CONTOH = `Ketik atau tempel soal di sini. Tidak harus rapi. Contoh:

1. Hasil dari 3/4 + 1/4 adalah...
A. 1/2
B. 1
C. 4/8
D. 2
Kunci: B

2. Ibu punya 12 kue, lalu dibagi rata ke 4 anak. Tiap anak dapat berapa kue?`;

/** Editor soal pilihan (brief 7.8): ketik bebas → rapikan (AI atau pembaca manual) → cek → simpan. */
export function EditorPaket({
  sesi,
  paket,
  kelasAwal,
  aiTersedia,
  onSelesai,
  onBatal,
  onSesiHabis,
}: {
  sesi: string;
  paket: PaketPilihan | null;
  kelasAwal: number;
  aiTersedia: boolean;
  onSelesai: () => void;
  onBatal: () => void;
  onSesiHabis: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [judul, setJudul] = useState(paket?.title ?? "");
  const [kelas, setKelas] = useState(paket?.kelas ?? kelasAwal);
  const [mapel, setMapel] = useState(paket?.subject ?? MAPEL[jenjangOf(kelasAwal)][0]);
  const [teks, setTeks] = useState(paket?.sourceText ?? "");
  const [soal, setSoal] = useState<SoalPilihan[]>(() => paket?.questions.map((q) => ({ ...q, options: [...q.options] })) ?? []);
  const [teksBerubah, setTeksBerubah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [merapikan, setMerapikan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pakaiAi, setPakaiAi] = useState(aiTersedia);
  const kartuCek = useRef<HTMLDivElement>(null);

  const jenjang = jenjangOf(kelas);
  const daftarMapel = MAPEL[jenjang];
  const mapelAktif = daftarMapel.includes(mapel) ? mapel : daftarMapel[0];

  function gantiJenjang(j: Jenjang) {
    setKelas(JENJANG_INFO[j].kelas[0]);
  }

  function tampilkanCek() {
    requestAnimationFrame(() => kartuCek.current?.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: "start" }));
  }

  function bacaTanpaAi(awalan = "") {
    const r = bacaManual(teks);
    setSoal(r.soal);
    setTeksBerubah(false);
    const pesan = r.galat.slice(0, 4).join(" ");
    if (!r.soal.length && !r.galat.length) setGalat('Belum ada soal yang terbaca. Mulai setiap soal dengan nomor, misalnya "1. ...".');
    else setGalat((awalan + pesan).trim() || null);
    if (r.soal.length) tampilkanCek();
  }

  async function rapikan() {
    if (!teks.trim()) return setGalat("Ketik atau tempel soalnya dulu, ya.");
    setGalat(null);
    if (!pakaiAi) return bacaTanpaAi();
    setMerapikan(true);
    try {
      const hasil = await api.rapikan(sesi, { kelas, mapel: mapelAktif, teks });
      setSoal(hasil);
      setTeksBerubah(false);
      tampilkanCek();
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : "";
      if (code === "admin_perlu") return onSesiHabis();
      if (code === "ai_belum_siap") {
        setPakaiAi(false);
        bacaTanpaAi('AI belum bisa dipakai, jadi soal dibaca dari format nomor, pilihan, dan "Kunci: ...". ');
      } else if (code === "ditolak") setGalat("Teks itu tidak bisa diproses. Coba periksa isinya.");
      else if (code === "terlalu_cepat" || code === "jatah_habis" || code === "tidak_valid") setGalat(apiMessage(e));
      else setGalat('Soal belum berhasil dirapikan. Tekan "Rapikan soal" sekali lagi.');
    } finally {
      setMerapikan(false);
    }
  }

  function pilihKunci(i: number, k: number) {
    setSoal((daftar) => daftar.map((q, j) => (j === i ? { ...q, answer: k, keyGuessed: false } : q)));
  }

  function hapusSoal(i: number) {
    setSoal((daftar) => daftar.filter((_, j) => j !== i));
  }

  async function simpan() {
    if (!soal.length) return setGalat('Tekan "Rapikan soal" dulu supaya soalnya bisa dicek sebelum disimpan.');
    if (teksBerubah) return setGalat('Teks soal berubah setelah dirapikan. Tekan "Rapikan soal" lagi supaya hasilnya ikut diperbarui.');
    setGalat(null);
    setMenyimpan(true);
    try {
      await api.simpanPaket(
        sesi,
        { title: judul.trim() || judulBawaan(mapelAktif, kelas), kelas, subject: mapelAktif, sourceText: teks, questions: soal },
        paket?.id,
      );
      toast(`Tersimpan. Muncul untuk ${kelasShort(kelas)} di pelajaran ${mapelAktif}.`);
      onSelesai();
    } catch (e) {
      if (e instanceof ApiFailure && e.code === "admin_perlu") return onSesiHabis();
      setGalat(apiMessage(e));
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="field">
          <label htmlFor={`${id}-judul`}>Judul paket</label>
          <input
            id={`${id}-judul`}
            className="input"
            type="text"
            maxLength={JUDUL_MAKS}
            placeholder="contoh: Latihan UTS Pecahan"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor={`${id}-jenjang`}>Untuk jenjang</label>
            <select id={`${id}-jenjang`} value={jenjang} onChange={(e) => gantiJenjang(e.target.value as Jenjang)}>
              {(Object.keys(JENJANG_INFO) as Jenjang[]).map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-kelas`}>Kelas</label>
            <select id={`${id}-kelas`} value={kelas} onChange={(e) => setKelas(Number(e.target.value))}>
              {JENJANG_INFO[jenjang].kelas.map((k) => (
                <option key={k} value={k}>
                  {jenjang === "SD" ? `Kelas ${k}` : `Kelas ${k} (kelas ${kelasInJenjang(k)} ${jenjang})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${id}-mapel`}>Mata pelajaran</label>
          <select id={`${id}-mapel`} value={mapelAktif} onChange={(e) => setMapel(e.target.value)}>
            {daftarMapel.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-teks`}>Soal</label>
          <textarea
            id={`${id}-teks`}
            maxLength={TEKS_ADMIN_MAKS}
            placeholder={CONTOH}
            value={teks}
            onChange={(e) => {
              setTeks(e.target.value);
              setTeksBerubah(true);
            }}
          />
          <span className="pv-note">
            {pakaiAi
              ? "AI akan memecah teks jadi soal, pilihan, dan kunci jawaban. Kalau pilihan atau kunci belum ada, AI melengkapinya dan memberi tanda supaya bisa Anda cek."
              : 'Tulis setiap soal dengan nomor, pilihan A sampai D, dan baris "Kunci: ..." supaya bisa dibaca.'}
          </span>
        </div>
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        <button className="btn" type="button" onClick={rapikan} disabled={merapikan}>
          {merapikan ? "Merapikan soal…" : "Rapikan soal"}
        </button>
      </div>

      {soal.length > 0 && (
        <div className="card" ref={kartuCek} aria-labelledby={`${id}-cek`}>
          <div className="split">
            <h2 id={`${id}-cek`}>Cek dulu sebelum simpan</h2>
            <span className="muted num">{soal.length} soal</span>
          </div>
          <p className="pv-note">Ketuk pilihan untuk menjadikannya kunci jawaban.</p>
          <ol className="pv">
            {soal.map((q, i) => (
              <li key={`${i}-${q.q}`} className={q.keyGuessed ? "pv-q warn" : "pv-q"}>
                <p>
                  {i + 1}. {q.q}
                </p>
                {q.keyGuessed && <span className="pv-note warn">Kunci dipilih AI. Mohon dicek.</span>}
                {q.optionsAdded && <span className="pv-note">Sebagian pilihan jawaban ditambahkan AI.</span>}
                {q.options.map((o, k) => (
                  <button
                    key={k}
                    type="button"
                    className={k === q.answer ? "pv-opt key" : "pv-opt"}
                    aria-pressed={k === q.answer}
                    onClick={() => pilihKunci(i, k)}
                  >
                    <span className="k">{HURUF[k]}.</span>
                    <span>{o}</span>
                  </button>
                ))}
                {q.explain && <p className="pv-note">Penjelasan: {q.explain}</p>}
                <button type="button" className="linkbtn danger" onClick={() => hapusSoal(i)}>
                  Hapus soal ini
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="row-btns">
        <button className="btn" type="button" onClick={simpan} disabled={menyimpan}>
          Simpan soal pilihan
        </button>
        <button className="btn ghost" type="button" onClick={onBatal}>
          Batal
        </button>
      </div>
    </>
  );
}
