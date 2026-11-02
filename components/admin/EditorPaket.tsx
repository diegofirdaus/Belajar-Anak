"use client";

import { useId, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { GambarSoal } from "@/components/GambarSoal";
import { merujukPilihanLain } from "@/lib/acakPilihan";
import { siapkanFoto } from "@/lib/foto";
import { kotakTengah, type Kotak } from "@/lib/gambarSoal";
import { PotongGambar } from "./PotongGambar";
import { JENJANG_INFO, MAPEL, jenjangOf, kelasInJenjang, kelasShort, type Jenjang } from "@/lib/kelas";
import {
  FOTO_MAKS,
  JUDUL_MAKS,
  POIN_HURUF_MAKS,
  POIN_PELENGKAP_MAKS,
  POIN_WAJIB_MAKS,
  TEKS_ADMIN_MAKS,
  bacaManual,
  judulBawaan,
  type KunciEsai,
  type PaketPilihan,
  type SoalPilihan,
} from "@/lib/soalPilihan";

const HURUF = "ABCD";

/** Soal di editor + data sementara gambar (tidak ikut disimpan di paket). */
type SoalEditor = SoalPilihan & {
  /** Usulan letak gambar dari AI saat membaca foto. */
  kotakUsulan?: Kotak;
  /** Potongan yang sudah dipilih tapi belum diunggah (base64 JPEG). */
  gambarBaru?: string;
  potongTerbuka?: boolean;
};

const keSoal = ({ kotakUsulan: _k, gambarBaru: _g, potongTerbuka: _p, ...q }: SoalEditor): SoalPilihan => q;
const adaGambar = (q: SoalEditor) => Boolean(q.gambarBaru || q.gambarId);
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
  const [soal, setSoal] = useState<SoalEditor[]>(() => paket?.questions.map((q) => structuredClone(q)) ?? []);
  /** Foto yang dibaca di editor ini (data URL), hanya di memori HP untuk memotong gambar soal. */
  const [foto, setFoto] = useState<string[]>([]);
  const [acakPilihan, setAcakPilihan] = useState(paket?.acakPilihan ?? true);
  const [teksBerubah, setTeksBerubah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [merapikan, setMerapikan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pakaiAi, setPakaiAi] = useState(aiTersedia);
  const kartuCek = useRef<HTMLDivElement>(null);
  const [membacaFoto, setMembacaFoto] = useState<number | null>(null);

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

  /** Foto/upload soal: dibaca AI, hasilnya ditambahkan ke teks dan ke kartu cek. Foto tidak disimpan. */
  async function bacaFoto(daftar: FileList | null) {
    if (!daftar?.length) return;
    const semua = [...daftar].filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (!semua.length) return setGalat("File itu bukan foto. Pilih foto soal, ya.");
    const files = semua.slice(0, FOTO_MAKS);
    setGalat(null);
    setMembacaFoto(files.length);
    try {
      const gambar = await siapkanFoto(files);
      const hasil = await api.bacaFoto(sesi, { kelas, mapel: mapelAktif, gambar });
      const awalFoto = foto.length;
      setFoto((f) => [...f, ...gambar.map((g) => `data:image/jpeg;base64,${g.data}`)]);
      const soalFoto: SoalEditor[] = hasil.soal.map((q, i) => {
        const k = hasil.kotak?.[i];
        return k ? { ...q, kotakUsulan: { ...k, foto: k.foto + awalFoto }, potongTerbuka: true } : q;
      });
      const kosong = !teks.trim();
      setTeks((t) => (kosong ? hasil.teks : `${t.trimEnd()}\n\n${hasil.teks}`));
      if (kosong || !teksBerubah) {
        // Soal yang sudah dirapikan tetap; soal dari foto ditambahkan di belakang.
        setSoal((lama) => [...(kosong ? [] : lama), ...soalFoto]);
        setTeksBerubah(false);
      } else {
        setTeksBerubah(true);
      }
      const catatan: string[] = [];
      if (semua.length > FOTO_MAKS) catatan.push(`Maksimal ${FOTO_MAKS} foto sekali unggah; ${semua.length - FOTO_MAKS} foto lainnya tidak dibaca.`);
      if (!kosong && teksBerubah) catatan.push('Teks dari foto sudah ditambahkan. Tekan "Rapikan soal" supaya soal yang Anda ketik ikut dirapikan.');
      setGalat(catatan.join(" ") || null);
      toast(`${hasil.soal.length} soal terbaca dari ${files.length} foto.`);
      if (kosong || !teksBerubah) tampilkanCek();
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : "";
      if (code === "admin_perlu") return onSesiHabis();
      if (code === "ai_belum_siap") {
        setPakaiAi(false);
        setGalat("Membaca foto butuh AI, dan AI sedang tidak tersedia. Ketik soalnya saja, ya.");
      } else if (code === "kurang_lengkap") setGalat("Tidak ada soal yang terbaca dari foto. Coba foto lebih dekat dan terang, satu halaman per foto.");
      else if (code === "ditolak") setGalat("Foto itu tidak bisa diproses. Coba foto halaman soal yang lain.");
      else if (code === "terlalu_cepat" || code === "jatah_habis" || code === "tidak_valid") setGalat(apiMessage(e));
      else if (!(e instanceof ApiFailure)) setGalat(e instanceof Error ? e.message : "Foto tidak bisa dibuka.");
      else setGalat("Foto belum berhasil dibaca. Coba sekali lagi.");
    } finally {
      setMembacaFoto(null);
    }
  }

  async function rapikan() {
    if (!teks.trim()) return setGalat("Ketik atau tempel soalnya dulu, ya.");
    setGalat(null);
    if (!pakaiAi) return bacaTanpaAi();
    setMerapikan(true);
    try {
      const hasil = await api.rapikan(sesi, { kelas, mapel: mapelAktif, teks });
      // Gambar yang sudah dipotong/diusulkan tetap menempel pada soal dengan teks yang sama.
      setSoal((lama) =>
        hasil.map((q): SoalEditor => {
          const x = lama.find((l) => l.q === q.q && (adaGambar(l) || l.kotakUsulan));
          return x ? { ...q, gambarId: x.gambarId, gambarBaru: x.gambarBaru, kotakUsulan: x.kotakUsulan, perluGambar: x.perluGambar || q.perluGambar } : q;
        }),
      );
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

  function ubahEsai(i: number, esai: KunciEsai) {
    setSoal((daftar) => daftar.map((q, j) => (j === i ? { ...q, esai, keyGuessed: false } : q)));
  }

  const ubahSoal = (i: number, f: (q: SoalEditor) => SoalEditor) => setSoal((daftar) => daftar.map((q, j) => (j === i ? f(q) : q)));

  /** Foto baru khusus untuk memotong gambar (tanpa AI), mis. saat mengubah paket lama. */
  async function fotoUntukGambar(i: number, daftar: FileList | null) {
    const f = daftar?.[0];
    if (!f) return;
    try {
      const [g] = await siapkanFoto([f]);
      const indeks = foto.length;
      setFoto((x) => [...x, `data:image/jpeg;base64,${g.data}`]);
      ubahSoal(i, (q) => ({ ...q, kotakUsulan: kotakTengah(indeks), potongTerbuka: true }));
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Foto tidak bisa dibuka.");
    }
  }

  function hapusSoal(i: number) {
    setSoal((daftar) => daftar.filter((_, j) => j !== i));
  }

  async function simpan() {
    if (!soal.length) return setGalat('Tekan "Rapikan soal" dulu supaya soalnya bisa dicek sebelum disimpan.');
    if (teksBerubah) return setGalat('Teks soal berubah setelah dirapikan. Tekan "Rapikan soal" lagi supaya hasilnya ikut diperbarui.');
    const terbuka = soal.findIndex((q) => q.potongTerbuka);
    if (terbuka >= 0) return setGalat(`Gambar soal nomor ${terbuka + 1} belum selesai dipotong. Tekan "Pakai gambar ini" atau "Batal".`);
    setGalat(null);
    setMenyimpan(true);
    // Unggah potongan gambar baru dulu (satu per satu), lalu simpan paket dengan id gambarnya.
    const siap: SoalEditor[] = [];
    try {
      for (const q of soal) {
        if (!q.gambarBaru) {
          siap.push(q);
          continue;
        }
        const gambarId = await api.simpanGambar(sesi, q.gambarBaru);
        siap.push({ ...q, gambarId, gambarBaru: undefined });
      }
    } catch (e) {
      setSoal((lama) => lama.map((q, i) => siap[i] ?? q));
      setMenyimpan(false);
      if (e instanceof ApiFailure && e.code === "admin_perlu") return onSesiHabis();
      return setGalat(`Gambar soal belum berhasil disimpan. ${apiMessage(e)}`);
    }
    setSoal(siap);
    const bersih = siap.map(keSoal).map((q) =>
      q.esai
        ? { ...q, esai: { contoh: q.esai.contoh.trim(), wajib: q.esai.wajib.map((x) => x.trim()).filter(Boolean), pelengkap: q.esai.pelengkap.map((x) => x.trim()).filter(Boolean) } }
        : q,
    );
    const tanpaPoin = bersih.findIndex((q) => q.esai && !q.esai.wajib.length);
    if (tanpaPoin >= 0) {
      setMenyimpan(false);
      return setGalat(`Soal esai nomor ${tanpaPoin + 1} belum punya poin wajib. Isi minimal 1 poin yang harus ada di jawaban anak.`);
    }
    try {
      await api.simpanPaket(
        sesi,
        { title: judul.trim() || judulBawaan(mapelAktif, kelas), kelas, subject: mapelAktif, sourceText: teks, questions: bersih, acakPilihan },
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
        {pakaiAi && (
          <div className="foto-soal">
            <input
              id={`${id}-foto`}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              disabled={membacaFoto !== null || merapikan}
              onChange={(e) => {
                const f = e.target.files;
                void bacaFoto(f).finally(() => {
                  e.target.value = "";
                });
              }}
            />
            <label htmlFor={`${id}-foto`} className={membacaFoto !== null ? "btn ghost foto-btn sibuk" : "btn ghost foto-btn"} aria-disabled={membacaFoto !== null || undefined}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {membacaFoto !== null ? `Membaca ${membacaFoto} foto…` : "Foto / upload soal"}
            </label>
            <span className="pv-note">
              Maksimal {FOTO_MAKS} foto sekali unggah. Foto hanya dibaca untuk mengambil soal, lalu dibuang (tidak disimpan). Hindari memotret nama,
              nama sekolah, atau wajah anak.
            </span>
          </div>
        )}
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        <button className="btn" type="button" onClick={rapikan} disabled={merapikan || membacaFoto !== null}>
          {merapikan ? "Merapikan soal…" : "Rapikan soal"}
        </button>
      </div>

      {soal.length > 0 && (
        <div className="card" ref={kartuCek} aria-labelledby={`${id}-cek`}>
          <div className="split">
            <h2 id={`${id}-cek`}>Cek dulu sebelum simpan</h2>
            <span className="muted num">{soal.length} soal</span>
          </div>
          <p className="pv-note">
            Ketuk pilihan untuk menjadikannya kunci jawaban.
            {soal.some((q) => q.esai) && " Soal esai dinilai benar kalau semua poin wajib ada di jawaban anak (kata boleh beda) dan tidak ada fakta yang keliru."}
          </p>
          <label className="saklar">
            <input type="checkbox" role="switch" checked={acakPilihan} onChange={(e) => setAcakPilihan(e.target.checked)} />
            <span className="saklar-teks">
              <strong>Acak urutan pilihan</strong>
              <span className="pv-note">
                {acakPilihan
                  ? "Setiap kali dikerjakan, urutan A–D diacak dan letak jawaban benar berpindah. Urutan soal tetap."
                  : "Pilihan tampil persis seperti urutan di sini."}
              </span>
            </span>
          </label>
          <ol className="pv">
            {soal.map((q, i) => (
              <li key={`${i}-${q.q}`} className={q.keyGuessed || (q.perluGambar && !adaGambar(q)) ? "pv-q warn" : "pv-q"}>
                <p>
                  {i + 1}. {q.q}
                </p>
                {q.esai && <span className="tag-esai">Esai · anak mengetik jawaban</span>}
                {q.keyGuessed && <span className="pv-note warn">{q.esai ? "Jawaban dibuat AI. Mohon dicek." : "Kunci dipilih AI. Mohon dicek."}</span>}
                {q.perluGambar && !adaGambar(q) && !q.potongTerbuka && (
                  <span className="pv-note warn">Soal ini butuh gambar. Potong gambarnya dari foto, atau hapus/ubah soalnya supaya tanpa gambar.</span>
                )}
                {q.potongTerbuka && foto.length > 0 ? (
                  <PotongGambar
                    nomor={i + 1}
                    foto={foto}
                    awal={q.kotakUsulan ?? kotakTengah(foto.length - 1)}
                    onPakai={(data) => ubahSoal(i, (x) => ({ ...x, gambarBaru: data, potongTerbuka: false }))}
                    onBatal={() => ubahSoal(i, (x) => ({ ...x, potongTerbuka: false }))}
                  />
                ) : adaGambar(q) ? (
                  <div className="gambar-editor">
                    <GambarSoal id={q.gambarId} data={q.gambarBaru} alt={`Gambar soal ${i + 1}`} />
                    <div className="row-btns">
                      {foto.length > 0 && (
                        <button type="button" className="linkbtn" onClick={() => ubahSoal(i, (x) => ({ ...x, potongTerbuka: true }))}>
                          Potong ulang
                        </button>
                      )}
                      <button
                        type="button"
                        className="linkbtn danger"
                        onClick={() => ubahSoal(i, (x) => ({ ...x, gambarId: undefined, gambarBaru: undefined }))}
                      >
                        Hapus gambar
                      </button>
                    </div>
                  </div>
                ) : foto.length > 0 ? (
                  <button type="button" className="linkbtn" onClick={() => ubahSoal(i, (x) => ({ ...x, potongTerbuka: true }))}>
                    {q.kotakUsulan ? "Lihat usulan gambar dari foto" : "+ Tambah gambar dari foto"}
                  </button>
                ) : (
                  <span className="foto-gambar">
                    <input
                      id={`${id}-gbr-${i}`}
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        void fotoUntukGambar(i, e.target.files).finally(() => {
                          e.target.value = "";
                        });
                      }}
                    />
                    <label htmlFor={`${id}-gbr-${i}`} className="linkbtn">
                      + Tambah gambar dari foto
                    </label>
                  </span>
                )}
                {q.optionsAdded && <span className="pv-note">Sebagian pilihan jawaban ditambahkan AI.</span>}
                {acakPilihan && merujukPilihanLain(q.options) && (
                  <span className="pv-note">Urutan pilihan soal ini tidak diacak karena ada pilihan yang merujuk pilihan lain.</span>
                )}
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
                {q.esai && <EditorEsai nomor={i + 1} esai={q.esai} onUbah={(e) => ubahEsai(i, e)} />}
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

/** Kunci soal esai di kartu "Cek dulu": contoh jawaban, poin wajib (1–2), poin pelengkap (0–3). */
function EditorEsai({ nomor, esai, onUbah }: { nomor: number; esai: KunciEsai; onUbah: (e: KunciEsai) => void }) {
  const id = useId();
  const ubahPoin = (jenis: "wajib" | "pelengkap", k: number, v: string) => onUbah({ ...esai, [jenis]: esai[jenis].map((x, j) => (j === k ? v : x)) });
  const hapusPoin = (jenis: "wajib" | "pelengkap", k: number) => onUbah({ ...esai, [jenis]: esai[jenis].filter((_, j) => j !== k) });
  const tambahPoin = (jenis: "wajib" | "pelengkap") => onUbah({ ...esai, [jenis]: [...esai[jenis], ""] });

  const daftar = (jenis: "wajib" | "pelengkap", judul: string, maks: number, min: number) => (
    <fieldset className="esai-poin">
      <legend>{judul}</legend>
      {esai[jenis].map((x, k) => (
        <div key={k} className="esai-baris">
          <input
            className="input"
            type="text"
            maxLength={POIN_HURUF_MAKS}
            aria-label={`Soal ${nomor}, ${jenis === "wajib" ? "poin wajib" : "poin pelengkap"} ${k + 1}`}
            value={x}
            onChange={(e) => ubahPoin(jenis, k, e.target.value)}
          />
          {esai[jenis].length > min && (
            <button type="button" className="linkbtn danger" onClick={() => hapusPoin(jenis, k)} aria-label={`Hapus ${jenis === "wajib" ? "poin wajib" : "poin pelengkap"} ${k + 1} soal ${nomor}`}>
              Hapus
            </button>
          )}
        </div>
      ))}
      {esai[jenis].length < maks && (
        <button type="button" className="linkbtn" onClick={() => tambahPoin(jenis)}>
          + Tambah {jenis === "wajib" ? "poin wajib" : "poin pelengkap"}
        </button>
      )}
    </fieldset>
  );

  return (
    <div className="esai-kunci">
      <div className="field">
        <label htmlFor={`${id}-contoh`}>Contoh jawaban</label>
        <textarea
          id={`${id}-contoh`}
          className="esai-contoh"
          maxLength={2000}
          value={esai.contoh}
          onChange={(e) => onUbah({ ...esai, contoh: e.target.value })}
        />
      </div>
      {daftar("wajib", "Poin wajib (harus ada supaya benar)", POIN_WAJIB_MAKS, 1)}
      {daftar("pelengkap", "Poin pelengkap (tidak wajib)", POIN_PELENGKAP_MAKS, 0)}
    </div>
  );
}
