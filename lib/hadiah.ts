// Aturan hadiah keempat dunia (brief 8.6). Fungsi murni: dipakai kartu markas, HUD, dan halaman hasil.
import type { Level } from "./kelas";
import type { Rewards } from "./rewards";

/** Untuk perhitungan hadiah, soal pilihan dihitung setara "sedang". */
export type LevelHadiah = Level | "pilihan";
const setara = (l: LevelHadiah): Level => (l === "pilihan" ? "sedang" : l);

type Ambang = { at: number; nama: string };

/** Tingkat terakhir yang sudah dicapai dan tingkat berikutnya (null kalau sudah tertinggi). */
function tingkat<T extends Ambang>(daftar: T[], nilai: number) {
  let i = 0;
  daftar.forEach((d, k) => {
    if (nilai >= d.at) i = k;
  });
  const kini = daftar[i];
  const berikut = daftar[i + 1] ?? null;
  const persen = berikut ? Math.round(((nilai - kini.at) / (berikut.at - kini.at)) * 100) : 100;
  return { indeks: i, kini, berikut, persen, kurang: berikut ? berikut.at - nilai : 0 };
}

/* ---------- Dunia Blok ---------- */
export const MATERIAL = ["kayu", "batu", "permata"] as const;
export type Material = (typeof MATERIAL)[number];
export const MATERIAL_WARNA: Record<Material, string> = { kayu: "#9a6a3f", batu: "#8d949b", permata: "#3fc3c9" };
export const MATERIAL_LEVEL: Record<Level, Material> = { mudah: "kayu", sedang: "batu", sulit: "permata" };
export const TINGKAT_BANGUNAN: Ambang[] = [
  { at: 0, nama: "Tenda" },
  { at: 15, nama: "Pondok Kayu" },
  { at: 40, nama: "Rumah Batu" },
  { at: 80, nama: "Menara" },
  { at: 140, nama: "Kastil Permata" },
];
export const jumlahBlok = (r: Rewards["blok"]) => r.kayu + r.batu + r.permata;
export const bangunan = (r: Rewards["blok"]) => tingkat(TINGKAT_BANGUNAN, jumlahBlok(r));

/* ---------- Arena Pahlawan ---------- */
export const XP_LEVEL: Record<Level, number> = { mudah: 10, sedang: 20, sulit: 30 };
export const BONUS_BOSS = 15;
export const RANK: Ambang[] = [
  { at: 0, nama: "Rekrut" },
  { at: 100, nama: "Ksatria" },
  { at: 300, nama: "Komandan" },
  { at: 600, nama: "Jenderal" },
  { at: 1000, nama: "Legenda Arena" },
];
export const rank = (xp: number) => tingkat(RANK, xp);
/** Boss kalah kalau jawaban benar ≥ ceil(70% × jumlah soal). */
export const syaratBoss = (n: number) => Math.ceil(0.7 * n);

/* ---------- Misi Antariksa ---------- */
export const BBM_LEVEL: Record<Level, number> = { mudah: 10, sedang: 20, sulit: 30 };
export type Tujuan = Ambang & { warna: string; r: number; cincin?: boolean; fakta: string };
export const TUJUAN: Tujuan[] = [
  { at: 0, nama: "Bumi", warna: "#3d7be0", r: 8, fakta: "Rumah kita, titik awal peluncuran." },
  { at: 40, nama: "Bulan", warna: "#cfcfcf", r: 5, fakta: "Bulan adalah satu-satunya satelit alami Bumi." },
  { at: 120, nama: "Mars", warna: "#d1603d", r: 7, fakta: "Mars disebut planet merah karena tanahnya mengandung karat besi." },
  { at: 260, nama: "Jupiter", warna: "#d9a066", r: 12, fakta: "Jupiter adalah planet terbesar di tata surya." },
  { at: 450, nama: "Saturnus", warna: "#e3c27a", r: 10, cincin: true, fakta: "Cincin Saturnus terbuat dari bongkahan es dan batu." },
  { at: 700, nama: "Uranus", warna: "#7fd6df", r: 9, fakta: "Uranus berputar dalam posisi miring, seperti menggelinding." },
  { at: 1000, nama: "Neptunus", warna: "#4b6fe0", r: 9, fakta: "Neptunus adalah planet terjauh dari Matahari." },
];
export const perjalanan = (liter: number) => tingkat(TUJUAN, liter);

/* ---------- Lembah Dino ---------- */
export const TULANG_LEVEL: Record<Level, number> = { mudah: 1, sedang: 2, sulit: 3 };
export const TULANG_PER_KERANGKA = 8;
export const DINO: { nama: string; fakta: string }[] = [
  { nama: "T-Rex", fakta: "Pemakan daging raksasa yang hidup sekitar 68 juta tahun lalu." },
  { nama: "Triceratops", fakta: "Punya tiga tanduk di kepala dan perisai besar di lehernya." },
  { nama: "Stegosaurus", fakta: "Punya lempeng-lempeng tegak di sepanjang punggungnya." },
  { nama: "Brachiosaurus", fakta: "Lehernya sangat panjang, kira-kira setinggi gedung 4 lantai." },
  { nama: "Velociraptor", fakta: "Kecil, gesit, dan tubuhnya berbulu." },
  { nama: "Ankylosaurus", fakta: "Tubuhnya berlapis baja dan ujung ekornya seperti gada." },
];
/** Dinosaurus yang sedang digali: urutan berputar sesuai jumlah kerangka yang sudah jadi. */
export const dinoDigali = (r: Rewards["dino"]) => DINO[r.done.length % DINO.length];
/** Isi museum: nama dan berapa kali kerangkanya selesai, urut sesuai pertama kali selesai. */
export function museum(r: Rewards["dino"]): { nama: string; jumlah: number }[] {
  const urut: string[] = [];
  const hitung: Record<string, number> = {};
  for (const n of r.done) {
    if (!(n in hitung)) urut.push(n);
    hitung[n] = (hitung[n] ?? 0) + 1;
  }
  return urut.map((nama) => ({ nama, jumlah: hitung[nama] }));
}

/* ---------- Hadiah satu jawaban benar ---------- */
export function hadiahJawaban(level: LevelHadiah) {
  const l = setara(level);
  return { material: MATERIAL_LEVEL[l], xp: XP_LEVEL[l], liter: BBM_LEVEL[l], tulang: TULANG_LEVEL[l] };
}
