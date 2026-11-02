// Logika murni untuk sesi latihan (brief 7.6, 7.7, 8.6, 9.2): dipakai server dan browser.
import {
  BONUS_BOSS,
  MATERIAL,
  TULANG_PER_KERANGKA,
  dinoDigali,
  hadiahJawaban,
  perjalanan,
  rank,
  syaratBoss,
  type LevelHadiah,
  type Material,
} from "./hadiah";
import { LEVELS, nextLevel, type Level } from "./kelas";
import type { Rewards } from "./rewards";
import type { WorldId } from "./worlds";

export type SumberSoal = "ai" | "set" | "set_similar" | "demo";

/** Hadiah yang didapat dari satu jawaban benar di satu dunia. */
export type HadiahSatu =
  | { dunia: "blok"; material: Material }
  | { dunia: "pahlawan"; xp: number }
  | { dunia: "antariksa"; liter: number }
  | { dunia: "dino"; tulang: number; kerangkaBaru: string[] };

/** Tambahkan hadiah satu jawaban benar ke `rewards` (salinan baru). Kerangka dino selesai saat tulang mencapai 8. */
export function terapkanJawabanBenar(r: Rewards, dunia: WorldId, level: LevelHadiah): { rewards: Rewards; hadiah: HadiahSatu } {
  const h = hadiahJawaban(level);
  const baru: Rewards = structuredClone(r);
  if (dunia === "blok") {
    baru.blok[h.material]++;
    return { rewards: baru, hadiah: { dunia, material: h.material } };
  }
  if (dunia === "pahlawan") {
    baru.pahlawan.xp += h.xp;
    return { rewards: baru, hadiah: { dunia, xp: h.xp } };
  }
  if (dunia === "antariksa") {
    baru.antariksa.fuel += h.liter;
    return { rewards: baru, hadiah: { dunia, liter: h.liter } };
  }
  baru.dino.bones += h.tulang;
  const kerangkaBaru: string[] = [];
  while (baru.dino.bones >= TULANG_PER_KERANGKA) {
    baru.dino.bones -= TULANG_PER_KERANGKA;
    const nama = dinoDigali(baru.dino).nama;
    baru.dino.done.push(nama);
    kerangkaBaru.push(nama);
  }
  return { rewards: baru, hadiah: { dunia, tulang: h.tulang, kerangkaBaru } };
}

/**
 * Kebalikan `terapkanJawabanBenar`: dipakai saat orang tua menandai jawaban esai jadi salah.
 * Tidak pernah membuat hadiah negatif. Kerangka dino yang selesai karena jawaban itu dibongkar lagi.
 */
export function kurangiHadiah(r: Rewards, h: HadiahSatu | null): Rewards {
  if (!h) return r;
  const baru: Rewards = structuredClone(r);
  if (h.dunia === "blok") baru.blok[h.material] = Math.max(0, baru.blok[h.material] - 1);
  else if (h.dunia === "pahlawan") baru.pahlawan.xp = Math.max(0, baru.pahlawan.xp - h.xp);
  else if (h.dunia === "antariksa") baru.antariksa.fuel = Math.max(0, baru.antariksa.fuel - h.liter);
  else {
    let bones = baru.dino.bones - h.tulang;
    for (const nama of [...h.kerangkaBaru].reverse()) {
      const k = baru.dino.done.lastIndexOf(nama);
      if (k < 0) continue;
      baru.dino.done.splice(k, 1);
      bones += TULANG_PER_KERANGKA;
    }
    baru.dino.bones = Math.max(0, bones);
  }
  return baru;
}

/** Boss Pahlawan diselesaikan saat sesi berakhir: kalah kalau benar ≥ ceil(70% × n), bonus 15 XP. */
export function terapkanAkhirSesi(r: Rewards, dunia: WorldId, benar: number, n: number): { rewards: Rewards; bossKalah: boolean } {
  if (dunia !== "pahlawan") return { rewards: r, bossKalah: false };
  const bossKalah = benar >= syaratBoss(n);
  if (!bossKalah) return { rewards: r, bossKalah };
  const baru: Rewards = structuredClone(r);
  baru.pahlawan.xp += BONUS_BOSS;
  baru.pahlawan.bosses++;
  return { rewards: baru, bossKalah };
}

/** Teks hadiah di kartu umpan balik, misalnya "+1 kayu". */
export function teksHadiahSatu(h: HadiahSatu): string {
  if (h.dunia === "blok") return `+1 ${h.material}`;
  if (h.dunia === "pahlawan") return `+${h.xp} XP · serangan kena!`;
  if (h.dunia === "antariksa") return `+${h.liter} liter bahan bakar`;
  return `+${h.tulang} tulang fosil`;
}

/** Kalimat saat jawaban benar (brief 8.6). */
export const KALIMAT_BENAR: Record<WorldId, string[]> = {
  blok: ["Mantap, blok didapat!", "Tepat sekali!", "Keren, terus menambang!"],
  pahlawan: ["Critical hit!", "Serangan tepat sasaran!", "Mantap, pahlawan!"],
  antariksa: ["Mesin menyala!", "Tepat sasaran, Kapten!", "Roket melaju kencang!"],
  dino: ["Fosil ditemukan!", "Galian yang bagus!", "Wah, tulang langka!"],
};

export const persen = (benar: number, n: number) => (n ? Math.round((benar / n) * 100) : 0);

/** Ringkasan hasil sesi untuk halaman hasil (brief 7.7). `awal` = hadiah sebelum sesi, `akhir` = sesudah. */
export function ringkasHasil(p: {
  dunia: WorldId;
  awal: Rewards;
  akhir: Rewards;
  benar: number;
  n: number;
  bossKalah: boolean;
}): { banner: string; menang: boolean; hadiah: string; tambahan: string } {
  const pct = persen(p.benar, p.n);
  const { awal, akhir } = p;
  if (p.dunia === "blok") {
    const hadiah = MATERIAL.map((m) => ({ m, x: akhir.blok[m] - awal.blok[m] }))
      .filter((d) => d.x > 0)
      .map((d) => `+${d.x} ${d.m}`)
      .join(" · ");
    const banner = pct >= 80 ? "Misi berhasil!" : pct >= 60 ? "Hampir sempurna!" : "Terus menambang!";
    return { banner, menang: pct >= 60, hadiah, tambahan: "" };
  }
  if (p.dunia === "pahlawan") {
    const xp = akhir.pahlawan.xp - awal.pahlawan.xp;
    const hadiah = xp > 0 ? `+${xp} XP${p.bossKalah ? " (termasuk bonus boss)" : ""}` : "";
    const sebelum = rank(awal.pahlawan.xp).kini.nama;
    const sesudah = rank(akhir.pahlawan.xp).kini.nama;
    return {
      banner: p.bossKalah ? "Victory! Boss tumbang" : "Boss masih bertahan",
      menang: p.bossKalah,
      hadiah,
      tambahan: sebelum !== sesudah ? `Naik rank! Sekarang kamu ${sesudah}.` : "",
    };
  }
  if (p.dunia === "antariksa") {
    const liter = akhir.antariksa.fuel - awal.antariksa.fuel;
    const sebelum = perjalanan(awal.antariksa.fuel);
    const sesudah = perjalanan(akhir.antariksa.fuel);
    return {
      banner: pct >= 60 ? "Peluncuran sukses!" : "Mesin perlu dicek lagi",
      menang: pct >= 60,
      hadiah: liter > 0 ? `+${liter} liter bahan bakar` : "",
      tambahan: sesudah.indeks > sebelum.indeks ? `Roketmu mendarat di ${sesudah.kini.nama}!` : "",
    };
  }
  const tulang = tulangTotal(akhir) - tulangTotal(awal);
  const selesai = akhir.dino.done.slice(awal.dino.done.length);
  return {
    banner: pct >= 60 ? "Ekspedisi sukses!" : "Terus menggali!",
    menang: pct >= 60,
    hadiah: tulang > 0 ? `+${tulang} tulang fosil` : "",
    tambahan: selesai.length ? `Kerangka ${selesai.join(" dan ")} selesai dan dipajang di museum!` : "",
  };
}

const tulangTotal = (r: Rewards) => r.dino.done.length * TULANG_PER_KERANGKA + r.dino.bones;

/** Pesan di halaman hasil (brief 7.7). */
export function pesanHasil(nama: string, level: string, benar: number, n: number): string {
  const pct = persen(benar, n);
  if (level === "pilihan") {
    if (pct >= 80) return `Kerja bagus, ${nama}! Soal pilihan ini sudah kamu kuasai.`;
    if (pct >= 60) return `Sedikit lagi, ${nama}. Coba soal yang mirip supaya makin mantap.`;
    return `Tidak apa-apa, ${nama}. Baca lagi penjelasannya, lalu ulangi soal ini.`;
  }
  const berikut = LEVELS.includes(level as Level) ? nextLevel(level as Level) : null;
  if (pct >= 80 && berikut) return `Kerja bagus, ${nama}! Kamu sudah menguasai level ${level}. Siap coba level ${berikut}?`;
  if (pct >= 80) return `Luar biasa, ${nama}! Level sulit pun sudah kamu kuasai.`;
  if (pct >= 60) return `Sedikit lagi, ${nama}. Ulangi level ${level} dengan soal baru supaya makin mantap.`;
  return `Tidak apa-apa, ${nama}. Baca lagi penjelasan tadi, lalu coba soal baru di level yang sama. Pelan-pelan pasti bisa.`;
}

/* ---------- Riwayat dan saran (brief 6, 9.2) ---------- */

/** Satu baris riwayat latihan. */
export type Riwayat = {
  id: string;
  mapel: string;
  topik: string;
  level: string;
  sumber: SumberSoal;
  n: number;
  benar: number;
  waktu: string;
};

/** Statistik satu topik per level: `best_pct`, `last_pct`, `tries`. */
export type StatLevel = { best: number; last: number; tries: number };
export type StatTopik = { mapel: string; topik: string; lv: Partial<Record<Level, StatLevel>>; waktu: string };

/** `lowercase(subject + "|" + topic)` dengan spasi dirapikan. */
const rapi = (t: string) => t.replace(/\s+/g, " ").trim();
export const kunciTopik = (mapel: string, topik: string) => `${rapi(mapel)}|${rapi(topik)}`.toLowerCase();

/** Akhiran judul soal contoh, dibuang saat topik dipakai mengisi form. */
export const AKHIRAN_CONTOH = " (soal contoh)";
export const tanpaAkhiranContoh = (t: string) => (t.endsWith(AKHIRAN_CONTOH) ? t.slice(0, -AKHIRAN_CONTOH.length) : t);

export type Saran = { jenis: "up" | "weak"; mapel: string; topik: string; level: Level; label: string };

/**
 * Siap naik: level tertinggi dengan best ≥ 80 ada, dan level berikutnya belum pernah ≥ 80.
 * Latih lagi: level dengan last < 60 dan best belum pernah ≥ 80. Maksimal 6 chip, topik terbaru dulu.
 */
export function hitungSaran(stats: StatTopik[], maks = 6): Saran[] {
  const hasil: Saran[] = [];
  const urut = [...stats].sort((a, b) => b.waktu.localeCompare(a.waktu));
  for (const t of urut) {
    const dikuasai = LEVELS.filter((l) => (t.lv[l]?.best ?? 0) >= 80);
    const tertinggi = dikuasai[dikuasai.length - 1];
    const berikut = tertinggi ? nextLevel(tertinggi) : null;
    if (berikut && (t.lv[berikut]?.best ?? 0) < 80) {
      hasil.push({ jenis: "up", mapel: t.mapel, topik: t.topik, level: berikut, label: `Siap naik: ${t.topik} → ${berikut}` });
    }
    for (const l of LEVELS) {
      const s = t.lv[l];
      if (s && s.last < 60 && s.best < 80) {
        hasil.push({ jenis: "weak", mapel: t.mapel, topik: t.topik, level: l, label: `Latih lagi: ${t.topik} (${l})` });
      }
    }
  }
  return hasil.slice(0, maks);
}

/** "24 Okt" (zona waktu Indonesia). */
export function tanggalPendek(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })
    .format(new Date(iso))
    .replace(".", "");
}

/** Label level di riwayat dan tag soal. */
export const labelLevel = (level: string) => (level === "pilihan" ? "soal pilihan" : level);
