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
