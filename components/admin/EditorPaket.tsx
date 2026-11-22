"use client";

import { TeksCampur } from "@/components/TeksCampur";
import { useId, useRef, useState } from "react";
import { Segment } from "@/components/Segment";
import { useToast } from "@/components/Toast";
import { api, apiMessage, ApiFailure } from "@/lib/api";
import { GambarSoal } from "@/components/GambarSoal";
import { merujukPilihanLain } from "@/lib/acakPilihan";
import { bacaDocx, keBase64 } from "@/lib/docx";
import { siapkanFoto } from "@/lib/foto";
import { kotakTengah, type Kotak } from "@/lib/gambarSoal";
import { PotongGambar } from "./PotongGambar";
import { JENJANG_INFO, MAPEL, jenjangOf, kelasInJenjang, kelasShort, type Jenjang } from "@/lib/kelas";
import {
  BACAAN_MIN,
  ESAI_BACAAN_MAKS,
  FOTO_MAKS,
  JUDUL_MAKS,
  PDF_BASE64_MAKS,
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
const TERIMA_AI = "image/*,application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc";
const TERIMA_TANPA_AI = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc";
const jenisFile = (f: File) =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name)
    ? "pdf"
    : /\.docx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ? "docx"
      : /\.doc$/i.test(f.name) || f.type === "application/msword"
        ? "doc"
        : f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name)
          ? "foto"
          : "lain";

/** Soal di editor + data sementara gambar (tidak ikut disimpan di paket). */
type SoalEditor = SoalPilihan & {
  /** Usulan letak gambar dari AI saat membaca foto. */
  kotakUsulan?: Kotak;
  /** Potongan yang sudah dipilih tapi belum diunggah (base64 JPEG). */
  gambarBaru?: string;
  potongTerbuka?: boolean;
  /** Pilihan yang ditandai di lembar foto/PDF (jawaban anak/kunci tertulis), -1 = tidak ada tanda. Pembanding kunci AI. */
  tandaFoto?: number;
};

const keSoal = ({ kotakUsulan: _k, gambarBaru: _g, potongTerbuka: _p, tandaFoto: _t, ...q }: SoalEditor): SoalPilihan => q;
const denganTanda = (q: SoalPilihan, t: number | null | undefined): SoalEditor => (q.jenis === "esai" ? q : { ...q, tandaFoto: t ?? -1 });
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

const CONTOH_BACAAN = `Ketik, tempel, atau foto/upload bacaan di sini: cerita, artikel, atau ringkasan materi dari buku.

AI akan membuat soal yang jawabannya ada di bacaan ini. Anak bisa membaca bacaannya saat mengerjakan.`;

type LevelBacaan = "mudah" | "sedang" | "sulit";

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
  /** Mode "Buat soal dari bacaan": teks = bacaan, AI membuat soal; bacaan tampil ke anak. */
  const [dariBacaan, setDariBacaan] = useState(paket?.dariBacaan ?? false);
  const [jumlahBacaan, setJumlahBacaan] = useState<"5" | "10" | "15">("10");
  const [levelBacaan, setLevelBacaan] = useState<LevelBacaan>("sedang");
  const [esaiBacaan, setEsaiBacaan] = useState<"0" | "1" | "2" | "3">("0");
  const [teksBerubah, setTeksBerubah] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [merapikan, setMerapikan] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pakaiAi, setPakaiAi] = useState(aiTersedia);
  const kartuCek = useRef<HTMLDivElement>(null);
  /** Teks status saat membaca foto/PDF/Word, atau null. */
  const [membaca, setMembaca] = useState<string | null>(null);

  const jenjang = jenjangOf(kelas);
  const daftarMapel = MAPEL[jenjang];
  const mapelAktif = daftarMapel.includes(mapel) ? mapel : daftarMapel[0];

  function gantiJenjang(j: Jenjang) {
    setKelas(JENJANG_INFO[j].kelas[0]);
  }

  function tampilkanCek() {
    requestAnimationFrame(() => kartuCek.current?.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: "start" }));
  }

  function bacaTanpaAi(awalan = "", teksDipakai: string = teks) {
    const r = bacaManual(teksDipakai);
    setSoal(r.soal);
    setTeksBerubah(false);
    const pesan = r.galat.slice(0, 4).join(" ");
    if (!r.soal.length && !r.galat.length) setGalat('Belum ada soal yang terbaca. Mulai setiap soal dengan nomor, misalnya "1. ...".');
    else setGalat((awalan + pesan).trim() || null);
    if (r.soal.length) tampilkanCek();
  }

  /** Upload soal: foto (maks 5), satu PDF, atau satu file Word (.docx). File tidak disimpan. */
  async function unggah(daftar: FileList | null) {
    if (!daftar?.length) return;
    const semua = [...daftar];
    if (dariBacaan) return unggahBacaan(semua);
    const dokumen = semua.find((f) => ["pdf", "docx", "doc"].includes(jenisFile(f)));
    if (dokumen) {
      const lain = semua.length - 1;
      const catatan = lain ? `Satu file dibaca sekali unggah; ${lain} file lainnya tidak dibaca.` : "";
      const jenis = jenisFile(dokumen);
      if (jenis === "doc") return setGalat("File Word lama (.doc) belum bisa dibaca. Simpan ulang sebagai .docx atau PDF di Word, lalu unggah lagi.");
      return jenis === "pdf" ? bacaPdf(dokumen, catatan) : bacaWord(dokumen, catatan);
    }
    if (!pakaiAi) return setGalat("Tanpa AI, hanya file Word (.docx) yang bisa dibaca.");
    const fotoSaja = semua.filter((f) => jenisFile(f) === "foto");
    if (!fotoSaja.length) return setGalat("File itu bukan foto, PDF, atau Word. Pilih file soal, ya.");
    return bacaFoto(fotoSaja);
  }

  /** Tambahkan teks bacaan ke kolom Bacaan (dipotong di batas maksimal). */
  function tambahBacaan(isi: string, catatanAwal: string[], sumber: string) {
    const gabung = teks.trim() ? `${teks.trimEnd()}\n\n${isi}` : isi;
    setTeks(gabung.slice(0, TEKS_ADMIN_MAKS));
    setTeksBerubah(true);
    const catatan = [...catatanAwal, gabung.length > TEKS_ADMIN_MAKS ? "Bacaan terlalu panjang; hanya 20.000 karakter pertama yang dipakai." : ""];
    setGalat(catatan.filter(Boolean).join(" ") || null);
    toast(`Bacaan dari ${sumber} sudah masuk. Cek teksnya, lalu tekan "Buat soal dari bacaan".`);
  }

  /** Mode bacaan: foto/PDF disalin AI menjadi teks, Word diambil di HP. Belum membuat soal. */
  async function unggahBacaan(semua: File[]) {
    const dokumen = semua.find((f) => ["pdf", "docx", "doc"].includes(jenisFile(f)));
    const catatan = dokumen && semua.length > 1 ? [`Satu file dibaca sekali unggah; ${semua.length - 1} file lainnya tidak dibaca.`] : [];
    if (dokumen) {
      const jenis = jenisFile(dokumen);
      if (jenis === "doc") return setGalat("File Word lama (.doc) belum bisa dibaca. Simpan ulang sebagai .docx atau PDF di Word, lalu unggah lagi.");
      if (jenis === "docx") {
        setGalat(null);
        setMembaca("Membaca file Word…");
        try {
          const isi = await bacaDocx(dokumen);
          if (!isi.trim()) return setGalat("File Word itu tidak berisi teks. Kalau bacaannya berupa gambar, simpan sebagai PDF atau foto halamannya.");
          tambahBacaan(isi, catatan, "file Word");
        } catch (e) {
          setGalat(e instanceof Error ? e.message : "File Word tidak bisa dibuka.");
        } finally {
          setMembaca(null);
        }
        return;
      }
    }
    if (!pakaiAi) return setGalat("Membaca foto atau PDF butuh AI, dan AI sedang tidak tersedia. Ketik atau tempel bacaannya.");
    const fotoSaja = semua.filter((f) => jenisFile(f) === "foto").slice(0, FOTO_MAKS);
    if (!dokumen && !fotoSaja.length) return setGalat("File itu bukan foto, PDF, atau Word. Pilih file bacaan, ya.");
    if (!dokumen && semua.length > FOTO_MAKS) catatan.push(`Maksimal ${FOTO_MAKS} foto sekali unggah; ${semua.length - FOTO_MAKS} foto lainnya tidak dibaca.`);
    const sumber = dokumen ? "PDF" : `${fotoSaja.length} foto`;
    setGalat(null);
    setMembaca(dokumen ? "Membaca PDF…" : `Membaca ${fotoSaja.length} foto…`);
    try {
      let isi: string;
      if (dokumen) {
        const data = await keBase64(dokumen);
        if (data.length > PDF_BASE64_MAKS) return setGalat("PDF terlalu besar (maksimal ±3 MB). Simpan ulang hanya halaman bacaannya, atau foto halamannya.");
        if (!data.startsWith("JVBERi")) return setGalat("File itu bukan PDF yang bisa dibaca.");
        isi = await api.salinBacaan(sesi, { kelas, mapel: mapelAktif, pdf: { data } });
      } else {
        isi = await api.salinBacaan(sesi, { kelas, mapel: mapelAktif, gambar: await siapkanFoto(fotoSaja) });
      }
      tambahBacaan(isi, catatan, sumber);
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : "";
      if (code === "kurang_lengkap") setGalat(`Tidak ada bacaan yang terbaca dari ${sumber}. ${dokumen ? "" : "Coba foto lebih dekat dan terang, satu halaman per foto."}`.trim());
      else galatBaca(e, dokumen ? "PDF" : "foto");
    } finally {
      setMembaca(null);
    }
  }

  /** Mode bacaan: AI membuat soal dari bacaan; hasilnya menggantikan soal di kartu "Cek dulu". */
  async function buatDariBacaan() {
    const bacaan = teks.trim();
    if (bacaan.length < BACAAN_MIN) return setGalat("Bacaannya terlalu pendek untuk dibuatkan soal. Tambahkan minimal beberapa kalimat, atau foto/upload bacaannya.");
    if (!pakaiAi) return setGalat("Membuat soal dari bacaan butuh AI, dan AI sedang tidak tersedia.");
    setGalat(null);
    setMerapikan(true);
    try {
      const hasil = await api.soalBacaan(sesi, {
        kelas,
        mapel: mapelAktif,
        teks: bacaan,
        n: Number(jumlahBacaan) as 5 | 10 | 15,
        level: levelBacaan,
        esai: Math.min(Number(esaiBacaan), Number(jumlahBacaan) - 1),
      });
      setSoal(hasil);
      setTeksBerubah(false);
      toast(`${hasil.length} soal dibuat dari bacaan. Cek dulu sebelum disimpan.`);
      tampilkanCek();
    } catch (e) {
      const code = e instanceof ApiFailure ? e.code : "";
      if (code === "admin_perlu") return onSesiHabis();
      if (code === "ai_belum_siap") {
        setPakaiAi(false);
        setGalat("Membuat soal dari bacaan butuh AI, dan AI sedang tidak tersedia.");
      } else if (code === "ditolak") setGalat("Bacaan itu tidak bisa diproses. Coba periksa isinya.");
      else if (code === "kurang_lengkap") setGalat('Soalnya belum lengkap. Tekan "Buat soal dari bacaan" sekali lagi.');
      else if (["terlalu_cepat", "terlalu_lama", "jatah_habis", "tidak_valid", "batas_api"].includes(code)) setGalat(apiMessage(e));
      else setGalat(`Soal belum berhasil dibuat (kode: ${e instanceof ApiFailure && e.message !== e.code ? e.message : e instanceof ApiFailure ? e.code : "jaringan"}). Tekan "Buat soal dari bacaan" sekali lagi.`);
    } finally {
      setMerapikan(false);
    }
  }

  /** Hasil baca foto/PDF: teks masuk ke kolom Soal, soal ke kartu "Cek dulu". */
  function terapkanBacaan(hasil: { teks: string; soal: SoalPilihan[] }, soalBaru: SoalEditor[], sumber: string, catatanAwal: string[]) {
    const kosong = !teks.trim();
    setTeks((t) => (kosong ? hasil.teks : `${t.trimEnd()}\n\n${hasil.teks}`));
    if (kosong || !teksBerubah) {
      // Soal yang sudah dirapikan tetap; soal baru ditambahkan di belakang.
      setSoal((lama) => [...(kosong ? [] : lama), ...soalBaru]);
      setTeksBerubah(false);
    } else {
      setTeksBerubah(true);
    }
    const catatan = [...catatanAwal];
    if (!kosong && teksBerubah) catatan.push(`Teks dari ${sumber} sudah ditambahkan. Tekan "Rapikan soal" supaya soal yang Anda ketik ikut dirapikan.`);
    setGalat(catatan.join(" ") || null);
    toast(`${hasil.soal.length} soal terbaca dari ${sumber}.`);
    if (kosong || !teksBerubah) tampilkanCek();
  }

  function galatBaca(e: unknown, sumber: "foto" | "PDF") {
    const code = e instanceof ApiFailure ? e.code : "";
    if (code === "admin_perlu") return onSesiHabis();
    if (code === "ai_belum_siap") {
      setPakaiAi(false);
      setGalat(`Membaca ${sumber} butuh AI, dan AI sedang tidak tersedia. Ketik soalnya, atau unggah file Word (.docx).`);
    } else if (code === "kurang_lengkap")
      setGalat(sumber === "foto" ? "Tidak ada soal yang terbaca dari foto. Coba foto lebih dekat dan terang, satu halaman per foto." : "Tidak ada soal yang terbaca dari PDF itu.");
    else if (code === "ditolak") setGalat(`${sumber === "foto" ? "Foto" : "PDF"} itu tidak bisa diproses. Coba halaman soal yang lain.`);
    else if (code === "terlalu_lama" || code === "terlalu_panjang")
      setGalat(
        sumber === "foto"
          ? "Halaman ini terlalu padat untuk dibaca sekaligus. Coba foto setengah halaman saja (misalnya kolom kiri dulu, lalu kolom kanan), atau kirim fotonya satu per satu. Jatah tidak berkurang."
          : "PDF ini terlalu panjang untuk dibaca sekaligus. Simpan ulang beberapa halaman saja, lalu unggah lagi. Jatah tidak berkurang.",
      );
    else if (code === "json_rusak") setGalat(`Hasil bacaan ${sumber} belum tersusun rapi. Coba sekali lagi; kalau tetap gagal, foto lebih dekat atau setengah halaman saja.`);
    else if (code === "jaringan") setGalat("Koneksi terputus saat mengirim. Pastikan internet stabil, lalu coba lagi.");
    else if (code === "terlalu_cepat" || code === "jatah_habis" || code === "tidak_valid" || code === "batas_api") setGalat(apiMessage(e));
    else if (!(e instanceof ApiFailure)) setGalat(e instanceof Error ? e.message : "File tidak bisa dibuka.");
    else {
      const kode = e.message && e.message !== code ? e.message : code;
      setGalat(`${sumber === "foto" ? "Foto" : "PDF"} belum berhasil dibaca (kode: ${kode}). Coba sekali lagi; kalau tetap gagal, kirimkan kode ini.`);
    }
  }

  /** Foto: dibaca AI; foto disimpan di memori untuk memotong gambar soal, tidak disimpan di server. */
  async function bacaFoto(semua: File[]) {
    const files = semua.slice(0, FOTO_MAKS);
    setGalat(null);
    setMembaca(`Membaca ${files.length} foto…`);
    try {
      const gambar = await siapkanFoto(files);
      const hasil = await api.bacaFoto(sesi, { kelas, mapel: mapelAktif, gambar });
      const awalFoto = foto.length;
      setFoto((f) => [...f, ...gambar.map((g) => `data:image/jpeg;base64,${g.data}`)]);
      const soalFoto: SoalEditor[] = hasil.soal.map((q0, i) => {
        const q = denganTanda(q0, hasil.tanda?.[i]);
        const k = hasil.kotak?.[i];
        return k ? { ...q, kotakUsulan: { ...k, foto: k.foto + awalFoto }, potongTerbuka: true } : q;
      });
      const catatan = semua.length > FOTO_MAKS ? [`Maksimal ${FOTO_MAKS} foto sekali unggah; ${semua.length - FOTO_MAKS} foto lainnya tidak dibaca.`] : [];
      terapkanBacaan(hasil, soalFoto, `${files.length} foto`, catatan);
    } catch (e) {
      galatBaca(e, "foto");
    } finally {
      setMembaca(null);
    }
  }

  /** PDF: dikirim utuh ke AI (maks ±3 MB) lalu dibuang. Gambar soal bisa ditambahkan dari foto/tangkapan layar. */
  async function bacaPdf(file: File, catatanAwal: string) {
    if (!pakaiAi) return setGalat("Membaca PDF butuh AI, dan AI sedang tidak tersedia. Unggah file Word (.docx), atau ketik soalnya.");
    setGalat(null);
    setMembaca("Membaca PDF…");
    try {
      const data = await keBase64(file);
      if (data.length > PDF_BASE64_MAKS)
        return setGalat("PDF terlalu besar (maksimal ±3 MB). Simpan ulang hanya halaman soalnya, atau foto halamannya.");
      if (!data.startsWith("JVBERi")) return setGalat("File itu bukan PDF yang bisa dibaca.");
      const hasil = await api.bacaFoto(sesi, { kelas, mapel: mapelAktif, pdf: { data } });
      const catatan = catatanAwal ? [catatanAwal] : [];
      if (hasil.soal.some((q) => q.perluGambar))
        catatan.push('Ada soal yang butuh gambar: tambahkan gambarnya lewat "+ Tambah gambar dari foto" (bisa dari tangkapan layar PDF).');
      terapkanBacaan(hasil, hasil.soal.map((q, i) => denganTanda(q, hasil.tanda?.[i])), "PDF", catatan);
    } catch (e) {
      galatBaca(e, "PDF");
    } finally {
      setMembaca(null);
    }
  }

  /** Word (.docx): teksnya diambil di HP (file tidak dikirim), dimasukkan ke kolom Soal, lalu dirapikan. */
  async function bacaWord(file: File, catatanAwal: string) {
    setGalat(null);
    setMembaca("Membaca file Word…");
    let isi: string;
    try {
      isi = await bacaDocx(file);
    } catch (e) {
      setMembaca(null);
      return setGalat(e instanceof Error ? e.message : "File Word tidak bisa dibuka.");
    }
    setMembaca(null);
    if (!isi.trim()) return setGalat("File Word itu tidak berisi teks. Kalau soalnya berupa gambar, simpan sebagai PDF atau foto halamannya.");
    const gabung = (teks.trim() ? `${teks.trimEnd()}\n\n${isi}` : isi).slice(0, TEKS_ADMIN_MAKS);
    setTeks(gabung);
    const terpotong = (teks.trim() ? teks.trimEnd().length + 2 : 0) + isi.length > TEKS_ADMIN_MAKS;
    const catatan = [catatanAwal, terpotong ? "Teks terlalu panjang; hanya 20.000 karakter pertama yang dipakai." : ""].filter(Boolean).join(" ");
    await rapikan(gabung, catatan);
  }

  async function rapikan(teksDipakai: string = teks, catatan = "") {
    if (!teksDipakai.trim()) return setGalat("Ketik atau tempel soalnya dulu, ya.");
    setGalat(catatan || null);
    if (!pakaiAi) return bacaTanpaAi(catatan ? `${catatan} ` : "", teksDipakai);
    setMerapikan(true);
    try {
      const hasil = await api.rapikan(sesi, { kelas, mapel: mapelAktif, teks: teksDipakai });
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
        bacaTanpaAi('AI belum bisa dipakai, jadi soal dibaca dari format nomor, pilihan, dan "Kunci: ...". ', teksDipakai);
      } else if (code === "ditolak") setGalat("Teks itu tidak bisa diproses. Coba periksa isinya.");
      else if (["terlalu_cepat", "jatah_habis", "tidak_valid", "batas_api", "terlalu_lama"].includes(code)) setGalat(apiMessage(e));
      else setGalat(`Soal belum berhasil dirapikan (kode: ${e instanceof ApiFailure && e.message !== e.code ? e.message : e instanceof ApiFailure ? e.code : "jaringan"}). Tekan "Rapikan soal" sekali lagi.`);
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
    if (teksBerubah && !dariBacaan) return setGalat('Teks soal berubah setelah dirapikan. Tekan "Rapikan soal" lagi supaya hasilnya ikut diperbarui.');
    if (dariBacaan && !teks.trim()) return setGalat("Bacaannya masih kosong. Bacaan ini yang akan dibaca anak saat mengerjakan.");
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
        { title: judul.trim() || judulBawaan(mapelAktif, kelas), kelas, subject: mapelAktif, sourceText: teks, questions: bersih, acakPilihan, dariBacaan },
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
        {(pakaiAi || dariBacaan) && (
          <Segment
            label="Cara membuat soal"
            columns={2}
            options={[
              { value: "jadi", label: "Soal sudah ada" },
              { value: "bacaan", label: "Buat dari bacaan" },
            ]}
            value={dariBacaan ? "bacaan" : "jadi"}
            onChange={(v) => {
              setDariBacaan(v === "bacaan");
              setGalat(null);
            }}
          />
        )}
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
          <label htmlFor={`${id}-teks`}>{dariBacaan ? "Bacaan atau materi" : "Soal"}</label>
          <textarea
            id={`${id}-teks`}
            maxLength={TEKS_ADMIN_MAKS}
            placeholder={dariBacaan ? CONTOH_BACAAN : CONTOH}
            className={dariBacaan ? "teks-bacaan" : undefined}
            dir="auto"
            value={teks}
            onChange={(e) => {
              setTeks(e.target.value);
              setTeksBerubah(true);
            }}
          />
          <span className="pv-note">
            {dariBacaan
              ? "Bacaan ini disimpan dan tampil di atas soal saat anak mengerjakan. Perbaiki kalau ada kata yang salah terbaca."
              : pakaiAi
              ? "AI akan memecah teks jadi soal, pilihan, dan kunci jawaban. Kalau pilihan atau kunci belum ada, AI melengkapinya dan memberi tanda supaya bisa Anda cek."
              : 'Tulis setiap soal dengan nomor, pilihan A sampai D, dan baris "Kunci: ..." supaya bisa dibaca.'}
          </span>
        </div>
        <div className="foto-soal">
          <input
            id={`${id}-foto`}
            className="sr-only"
            type="file"
            accept={pakaiAi ? TERIMA_AI : TERIMA_TANPA_AI}
            multiple={pakaiAi}
            disabled={membaca !== null || merapikan}
            onChange={(e) => {
              const f = e.target.files;
              void unggah(f).finally(() => {
                e.target.value = "";
              });
            }}
          />
          <label htmlFor={`${id}-foto`} className={membaca !== null ? "btn ghost foto-btn sibuk" : "btn ghost foto-btn"} aria-disabled={membaca !== null || undefined}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {membaca ?? (dariBacaan ? "Foto / upload bacaan" : pakaiAi ? "Foto / upload soal" : "Upload file Word (.docx)")}
          </label>
          <span className="pv-note">
            {dariBacaan
              ? `Bisa foto (maksimal ${FOTO_MAKS} sekali unggah), satu PDF (maksimal ±3 MB), atau satu file Word (.docx). Hanya teks bacaannya yang disimpan; foto dan file dibuang. Hindari memotret nama, nama sekolah, atau wajah anak.`
              : pakaiAi
              ? `Bisa foto (maksimal ${FOTO_MAKS} sekali unggah), satu PDF (maksimal ±3 MB), atau satu file Word (.docx). File hanya dibaca untuk mengambil soal, lalu dibuang (tidak disimpan). Hindari memotret nama, nama sekolah, atau wajah anak.`
              : "Teks soal di file Word (.docx) diambil di HP ini, lalu dibaca dari format nomor, pilihan, dan \"Kunci: ...\"."}
          </span>
        </div>
        {dariBacaan && (
          <>
            <Segment
              label="Jumlah soal"
              options={[
                { value: "5", label: "5 soal" },
                { value: "10", label: "10 soal" },
                { value: "15", label: "15 soal" },
              ]}
              value={jumlahBacaan}
              onChange={setJumlahBacaan}
            />
            <Segment
              label="Tingkat soal"
              options={[
                { value: "mudah", label: "Mudah" },
                { value: "sedang", label: "Sedang" },
                { value: "sulit", label: "Sulit" },
              ]}
              value={levelBacaan}
              onChange={setLevelBacaan}
            />
            <div className="field">
              <label htmlFor={`${id}-esai`}>Soal esai di antaranya</label>
              <select id={`${id}-esai`} value={esaiBacaan} onChange={(e) => setEsaiBacaan(e.target.value as typeof esaiBacaan)}>
                {Array.from({ length: ESAI_BACAAN_MAKS + 1 }, (_, k) => (
                  <option key={k} value={String(k)}>
                    {k === 0 ? "Tidak ada (semua pilihan ganda)" : `${k} soal esai (anak mengetik jawaban)`}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {galat && (
          <p className="form-msg" role="alert">
            {galat}
          </p>
        )}
        {dariBacaan ? (
          <button className="btn" type="button" onClick={buatDariBacaan} disabled={merapikan || membaca !== null}>
            {merapikan ? "Membuat soal dari bacaan…" : soal.length ? "Buat ulang soal dari bacaan" : "Buat soal dari bacaan"}
          </button>
        ) : (
          <button className="btn" type="button" onClick={() => rapikan()} disabled={merapikan || membaca !== null}>
            {merapikan ? "Merapikan soal…" : "Rapikan soal"}
          </button>
        )}
      </div>

      {soal.length > 0 && (
        <div className="card" ref={kartuCek} aria-labelledby={`${id}-cek`}>
          <div className="split">
            <h2 id={`${id}-cek`}>Cek dulu sebelum simpan</h2>
            <span className="muted num">{soal.length} soal</span>
          </div>
          <p className="pv-note">
            {dariBacaan && "Soal dibuat AI dari bacaan. Periksa apakah kunci jawabannya sesuai bacaan. "}
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
                  {i + 1}. <TeksCampur teks={q.q} />
                </p>
                {q.esai && <span className="tag-esai">Esai · anak mengetik jawaban</span>}
                {q.keyGuessed && (
                  <span className="pv-note warn">
                    {q.esai
                      ? "Jawaban dibuat AI. Mohon dicek."
                      : q.tandaFoto !== undefined && q.tandaFoto >= 0 && q.tandaFoto !== q.answer
                        ? `Di foto ditandai ${HURUF[q.tandaFoto]}, tapi menurut AI jawaban yang benar ${HURUF[q.answer]}. Mohon dicek.`
                        : q.tandaFoto === -1
                          ? "Tidak ada tanda jawaban di foto, jadi kunci dipilih AI. Mohon dicek."
                          : "Kunci dipilih AI. Mohon dicek."}
                  </span>
                )}
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
                    <span>
                      <TeksCampur teks={o} />
                    </span>
                  </button>
                ))}
                {q.esai && <EditorEsai nomor={i + 1} esai={q.esai} onUbah={(e) => ubahEsai(i, e)} />}
                {q.explain && (
                  <p className="pv-note">
                    Penjelasan: <TeksCampur teks={q.explain} />
                  </p>
                )}
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
