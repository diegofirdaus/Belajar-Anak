// Dashboard progres orang tua: ringkasan murni dari riwayat & statistik topik. Dipakai server dan browser.
import { bangunan, jumlahBlok, perjalanan, rank } from "./hadiah";
import { hitungSaran, persen, type Riwayat, type Saran, type StatTopik } from "./latihan";
import type { Rewards } from "./rewards";
import type { WorldId } from "./worlds";

export const HARI_RINGKAS = 7;

export type ProgresPemain = {
  id: string;
  name: string;
  kelas: number;
  theme: WorldId;
  rewards: Rewards;
  riwayat: Riwayat[];
  topik: StatTopik[];
  /** Paket soal AI yang sudah dipakai hari ini (WIB). */
  aiHariIni: number;
};

export type DataProgres = {
  pemain: ProgresPemain[];
  ai: { keluargaHariIni: number; batasPemain: number; batasKeluarga: number };
  /** Riwayat yang diambil per anak (ringkasan dihitung dari sini). */
  riwayatMaks: number;
};

export type BarisMapel = { mapel: string; latihan: number; soal: number; benar: number; pct: number };

export type Ringkasan = {
  latihan: number;
  latihanPekanIni: number;
  soal: number;
  benar: number;
  pct: number;
  terakhir: string | null;
  perMapel: BarisMapel[];
  perluDibantu: Saran[];
  siapNaik: Saran[];
};

/** Ringkasan satu anak. `kini` dipakai untuk menghitung "7 hari terakhir". */
export function ringkas(riwayat: Riwayat[], topik: StatTopik[], kini = new Date()): Ringkasan {
  const batas = kini.getTime() - HARI_RINGKAS * 86_400_000;
  const soal = riwayat.reduce((a, r) => a + r.n, 0);
  const benar = riwayat.reduce((a, r) => a + r.benar, 0);
  const peta = new Map<string, BarisMapel>();
  for (const r of riwayat) {
    const m = peta.get(r.mapel) ?? { mapel: r.mapel, latihan: 0, soal: 0, benar: 0, pct: 0 };
    m.latihan++;
    m.soal += r.n;
    m.benar += r.benar;
    peta.set(r.mapel, m);
  }
  const perMapel = [...peta.values()]
    .map((m) => ({ ...m, pct: persen(m.benar, m.soal) }))
    .sort((a, b) => b.latihan - a.latihan || a.mapel.localeCompare(b.mapel, "id"));
  const saran = hitungSaran(topik, Infinity);
  return {
    latihan: riwayat.length,
    latihanPekanIni: riwayat.filter((r) => new Date(r.waktu).getTime() >= batas).length,
    soal,
    benar,
    pct: persen(benar, soal),
    terakhir: riwayat.reduce<string | null>((a, r) => (!a || r.waktu > a ? r.waktu : a), null),
    perMapel,
    perluDibantu: saran.filter((s) => s.jenis === "weak"),
    siapNaik: saran.filter((s) => s.jenis === "up"),
  };
}

/** Satu baris ringkasan hadiah di dunia aktif, misalnya "Pondok Kayu · 31 blok". */
export function ringkasHadiah(theme: WorldId, r: Rewards): string {
  if (theme === "blok") return `${bangunan(r.blok).kini.nama} · ${jumlahBlok(r.blok)} blok`;
  if (theme === "pahlawan") return `Rank ${rank(r.pahlawan.xp).kini.nama} · ${r.pahlawan.xp} XP · ${r.pahlawan.bosses} boss`;
  if (theme === "antariksa") return `Di ${perjalanan(r.antariksa.fuel).kini.nama} · ${r.antariksa.fuel} liter`;
  return `${r.dino.done.length} kerangka · ${r.dino.bones}/8 tulang`;
}

/** "hari ini", "kemarin", "3 hari lalu", atau tanggal pendek kalau lebih dari seminggu. */
export function kapan(iso: string, kini = new Date()): string {
  const hari = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
  const selisih = Math.round((Date.parse(hari(kini)) - Date.parse(hari(new Date(iso)))) / 86_400_000);
  if (selisih <= 0) return "hari ini";
  if (selisih === 1) return "kemarin";
  if (selisih < 7) return `${selisih} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso)).replace(".", "");
}

/* ======================================================================
 * Dashboard v2: status 7 hari terakhir, aktivitas, tren per mapel,
 * perbandingan bulanan, dan saran bantuan. Semua tanggal memakai WIB.
 * ====================================================================== */

const HARI_MS = 86_400_000;
const fmtTanggal = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
/** "2026-11-10" (tanggal WIB). */
export const kunciHari = (d: Date | string) => fmtTanggal.format(typeof d === "string" ? new Date(d) : d);
/** Selisih hari kalender WIB: b - a. */
const selisihHari = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / HARI_MS);
const geserHari = (kunci: string, n: number) => new Date(Date.parse(kunci) + n * HARI_MS).toISOString().slice(0, 10);
const NAMA_HARI_PENDEK = ["M", "S", "S", "R", "K", "J", "S"]; // Minggu..Sabtu
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tanggalPendekKunci = (k: string) => `${Number(k.slice(8, 10))} ${BULAN_PENDEK[Number(k.slice(5, 7)) - 1]}`;
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Persen benar gabungan dari beberapa latihan (soal benar / soal). */
const pctDari = (rs: Riwayat[]) => {
  const n = rs.reduce((a, r) => a + r.n, 0);
  return n ? Math.round((rs.reduce((a, r) => a + r.benar, 0) / n) * 100) : null;
};

/** Latihan dalam rentang hari ke-`dari`..`sampai` sebelum hari ini (0 = hari ini), inklusif. */
function dalamRentang(riwayat: Riwayat[], hariIni: string, dari: number, sampai: number) {
  return riwayat.filter((r) => {
    const s = selisihHari(kunciHari(r.waktu), hariIni);
    return s >= dari && s <= sampai;
  });
}

export const AMBANG = { hariRajin: 3, hariBelumLatihan: 3, latihanMinPerPeriode: 2, sorotanMinPoin: 5 } as const;

export type StatusAnak = {
  warna: "hijau" | "oranye" | "netral";
  /** Kalimat utama tanpa nama, misalnya "rajin dalam 7 hari terakhir". */
  judul: string;
  detail: string;
  sorotan: { naik: boolean; teks: string } | null;
};

/**
 * Status 7 hari terakhir (bergeser setiap hari):
 * hijau = latihan ≥ 3 hari berbeda; oranye = tidak latihan ≥ 3 hari; selain itu netral.
 * Sorotan naik/turun per mapel hanya kalau mapel itu punya ≥ 2 latihan di 7 hari terakhir DAN 7 hari sebelumnya.
 */
export function statusAnak(riwayat: Riwayat[], kini = new Date()): StatusAnak {
  const hariIni = kunciHari(kini);
  if (!riwayat.length) return { warna: "netral", judul: "belum pernah latihan", detail: "Hasil latihan pertama akan muncul di sini.", sorotan: null };
  const terakhir = riwayat.reduce((a, r) => (r.waktu > a.waktu ? r : a));
  const sejak = selisihHari(kunciHari(terakhir.waktu), hariIni);
  const kini7 = dalamRentang(riwayat, hariIni, 0, 6);
  const lalu7 = dalamRentang(riwayat, hariIni, 7, 13);
  const hariAktif = new Set(kini7.map((r) => kunciHari(r.waktu))).size;
  const mapel7 = new Set(kini7.map((r) => r.mapel)).size;

  let sorotan: StatusAnak["sorotan"] = null;
  let terbesar = 0;
  for (const m of new Set(kini7.map((r) => r.mapel))) {
    const a = kini7.filter((r) => r.mapel === m);
    const b = lalu7.filter((r) => r.mapel === m);
    if (a.length < AMBANG.latihanMinPerPeriode || b.length < AMBANG.latihanMinPerPeriode) continue;
    const d = (pctDari(a) ?? 0) - (pctDari(b) ?? 0);
    if (Math.abs(d) >= AMBANG.sorotanMinPoin && Math.abs(d) > Math.abs(terbesar)) {
      terbesar = d;
      sorotan = { naik: d > 0, teks: `${m} ${d > 0 ? "naik" : "turun"} ${Math.abs(d)} poin dari 7 hari sebelumnya` };
    }
  }

  if (sejak >= AMBANG.hariBelumLatihan) {
    const hari = NAMA_HARI[new Date(Date.parse(kunciHari(terakhir.waktu))).getUTCDay()];
    return {
      warna: "oranye",
      judul: `belum latihan ${sejak} hari`,
      detail: `Terakhir ${sejak < 7 ? hari : kapan(terakhir.waktu, kini)} · ${terakhir.mapel} ${terakhir.benar}/${terakhir.n}`,
      sorotan,
    };
  }
  const detail = `${kini7.length} latihan · ${mapel7} mata pelajaran`;
  if (hariAktif >= AMBANG.hariRajin) return { warna: "hijau", judul: "rajin dalam 7 hari terakhir", detail, sorotan };
  return { warna: "netral", judul: `latihan ${hariAktif} hari dalam 7 hari terakhir`, detail, sorotan };
}

/** Jumlah latihan per hari selama `hari` hari terakhir (paling lama dulu). */
export function aktivitas(riwayat: Riwayat[], kini = new Date(), hari = 14) {
  const hariIni = kunciHari(kini);
  const hitung = new Map<string, number>();
  for (const r of riwayat) {
    const k = kunciHari(r.waktu);
    hitung.set(k, (hitung.get(k) ?? 0) + 1);
  }
  const daftar = Array.from({ length: hari }, (_, i) => {
    const k = geserHari(hariIni, i - hari + 1);
    return { tanggal: k, label: NAMA_HARI_PENDEK[new Date(Date.parse(k)).getUTCDay()], jumlah: hitung.get(k) ?? 0 };
  });
  return { daftar, hariAktif: daftar.filter((d) => d.jumlah > 0).length, maks: Math.max(1, ...daftar.map((d) => d.jumlah)) };
}

/** Mapel urut dari yang paling sering dilatih. */
export function mapelTerurut(riwayat: Riwayat[]): string[] {
  const n = new Map<string, number>();
  for (const r of riwayat) n.set(r.mapel, (n.get(r.mapel) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id")).map(([m]) => m);
}

const URUT_LEVEL = ["mudah", "sedang", "sulit"] as const;
export type TitikTren = { mulai: string; label: string; pct: number | null; soal: number; level: (typeof URUT_LEVEL)[number] | null };

/**
 * Tren satu mapel: rata-rata benar per 7 hari (bergeser, berakhir hari ini), paling lama dulu.
 * `level` = level tertinggi soal AI di periode itu, untuk menandai kapan anak naik level.
 * Periode kosong di depan dibuang.
 */
export function trenMapel(riwayat: Riwayat[], mapel: string, kini = new Date(), periode = 8): TitikTren[] {
  const hariIni = kunciHari(kini);
  const rs = riwayat.filter((r) => r.mapel === mapel);
  const titik: TitikTren[] = [];
  for (let i = periode - 1; i >= 0; i--) {
    const isi = dalamRentang(rs, hariIni, i * 7, i * 7 + 6);
    const lv = isi.map((r) => URUT_LEVEL.indexOf(r.level as (typeof URUT_LEVEL)[number])).filter((x) => x >= 0);
    const mulai = geserHari(hariIni, -(i * 7 + 6));
    titik.push({
      mulai,
      label: i === 0 ? "Ini" : tanggalPendekKunci(mulai),
      pct: pctDari(isi),
      soal: isi.reduce((a, r) => a + r.n, 0),
      level: lv.length ? URUT_LEVEL[Math.max(...lv)] : null,
    });
  }
  const awal = titik.findIndex((t) => t.pct !== null);
  return awal < 0 ? [] : titik.slice(awal);
}

/** "2026-11" (bulan WIB) dan namanya. */
export const kunciBulan = (d: Date | string) => kunciHari(d).slice(0, 7);
export const namaBulan = (k: string) => `${BULAN[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
export const namaBulanPendek = (k: string) => BULAN_PENDEK[Number(k.slice(5, 7)) - 1];

/** Bulan yang punya latihan, ditambah bulan ini, terbaru dulu. */
export function daftarBulan(riwayat: Riwayat[], kini = new Date()): string[] {
  return [...new Set([kunciBulan(kini), ...riwayat.map((r) => kunciBulan(r.waktu))])].sort().reverse();
}

export type RingkasBulan = {
  latihan: number;
  hariAktif: number;
  soal: number;
  soalPilihan: number;
  perMapel: Map<string, number | null>;
};

function ringkasBulan(riwayat: Riwayat[], bulan: string): RingkasBulan {
  const rs = riwayat.filter((r) => kunciBulan(r.waktu) === bulan);
  const perMapel = new Map<string, number | null>();
  for (const m of new Set(rs.map((r) => r.mapel))) perMapel.set(m, pctDari(rs.filter((r) => r.mapel === m)));
  return {
    latihan: rs.length,
    hariAktif: new Set(rs.map((r) => kunciHari(r.waktu))).size,
    soal: rs.reduce((a, r) => a + r.n, 0),
    soalPilihan: rs.filter((r) => r.sumber === "set" || r.sumber === "set_similar").length,
    perMapel,
  };
}

/** Perbandingan dua bulan. Persen benar hanya per mapel (tidak digabung). */
export function bandingBulan(riwayat: Riwayat[], bulanA: string, bulanB: string) {
  const a = ringkasBulan(riwayat, bulanA);
  const b = ringkasBulan(riwayat, bulanB);
  const mapel = mapelTerurut(riwayat.filter((r) => [bulanA, bulanB].includes(kunciBulan(r.waktu))));
  return {
    baris: [
      { label: "Latihan", a: a.latihan, b: b.latihan },
      { label: "Hari aktif", a: a.hariAktif, b: b.hariAktif },
      { label: "Soal dijawab", a: a.soal, b: b.soal },
      { label: "Soal pilihan", a: a.soalPilihan, b: b.soalPilihan },
    ],
    perMapel: mapel.map((m) => ({ mapel: m, a: a.perMapel.get(m) ?? null, b: b.perMapel.get(m) ?? null })),
  };
}

export type Bantuan = { jenis: "lemah" | "lama" | "naik"; judul: string; alasan: string; saran: string };

/**
 * Paling banyak 3 hal yang bisa dibantu orang tua: topik lemah (maks 2), mapel yang lama
 * tidak dilatih (≥ 21 hari, maks 1), dan topik yang siap naik level (maks 1). Sisa slot diisi urutan yang sama.
 */
export function bisaDibantu(nama: string, riwayat: Riwayat[], topik: StatTopik[], kini = new Date(), maks = 3): Bantuan[] {
  const saran = hitungSaran(topik, Infinity);
  const lemah: Bantuan[] = saran
    .filter((s) => s.jenis === "weak")
    .map((s) => {
      const st = topik.find((t) => t.mapel === s.mapel && t.topik === s.topik)?.lv[s.level];
      return {
        jenis: "lemah" as const,
        judul: `${s.mapel}: ${s.topik}`,
        alasan: `Skor terakhir ${st?.last ?? 0}% di level ${s.level}${st && st.tries > 1 ? ` · ${st.tries} kali dicoba` : ""}`,
        saran: `Ajak ${nama} membaca ulang materinya, lalu latihan lagi di level ${s.level}.`,
      };
    });
  const naik: Bantuan[] = saran
    .filter((s) => s.jenis === "up")
    .map((s) => {
      const sebelum = URUT_LEVEL[URUT_LEVEL.indexOf(s.level as (typeof URUT_LEVEL)[number]) - 1];
      const st = topik.find((t) => t.mapel === s.mapel && t.topik === s.topik)?.lv[sebelum];
      return {
        jenis: "naik" as const,
        judul: `${s.mapel}: ${s.topik}`,
        alasan: `${st?.best ?? 80}% di level ${sebelum} · siap naik`,
        saran: `Dorong ${nama} mencoba level ${s.level}.`,
      };
    });
  const hariIni = kunciHari(kini);
  const lama: Bantuan[] = mapelTerurut(riwayat)
    .map((m) => {
      const akhir = riwayat.filter((r) => r.mapel === m).reduce((a, r) => (r.waktu > a ? r.waktu : a), "");
      return { m, hari: selisihHari(kunciHari(akhir), hariIni) };
    })
    .filter((x) => x.hari >= 21)
    .map((x) => ({
      jenis: "lama" as const,
      judul: x.m,
      alasan: `Belum dilatih ${Math.floor(x.hari / 7)} minggu`,
      saran: `Ajak ${nama} latihan ${x.m} lagi, atau buat soal pilihan dari PR sekolahnya di tab Soal pilihan.`,
    }));
  const pilih = [...lemah.slice(0, 2), ...lama.slice(0, 1), ...naik.slice(0, 1)];
  const sisa = [...lemah.slice(2), ...lama.slice(1), ...naik.slice(1)];
  return [...pilih, ...sisa].slice(0, maks);
}
