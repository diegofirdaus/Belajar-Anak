// Gambar di soal pilihan orang tua dari foto (STATUS "BERIKUTNYA" no. 3). Logika murni, dipakai server dan browser.
// Hanya POTONGAN gambar yang disimpan (satu dokumen Firestore per gambar). Foto halaman utuh tidak pernah disimpan.
import { z } from "zod";

/** Letak gambar di foto: indeks foto (dari 0) dan sudut kiri-atas/kanan-bawah dalam pecahan 0–1. */
export type Kotak = { foto: number; x1: number; y1: number; x2: number; y2: number };

/** Potongan terkecil (pecahan sisi foto) supaya kotak masih bisa dipegang jari. */
export const KOTAK_MIN = 0.05;
/** Sisi terpanjang potongan yang disimpan, dan target ukuran (±100–200 KB). */
export const GAMBAR_SISI_MAKS = 900;
export const GAMBAR_TARGET_BYTE = 180_000;
/** Batas panjang base64 potongan di server (±300 KB), jauh di bawah batas dokumen Firestore 1 MiB. */
export const GAMBAR_BASE64_MAKS = 400_000;
/** Batas gambar per keluarga. */
export const GAMBAR_PER_KELUARGA_MAKS = 1000;

export const gambarIdSchema = z.string().regex(/^[A-Za-z0-9]{10,40}$/);

export const gambarBaruSchema = z
  .object({
    data: z
      .string()
      .min(100)
      .max(GAMBAR_BASE64_MAKS, "Gambar terlalu besar.")
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();

const batas = (v: number) => Math.min(1, Math.max(0, v));

/** Rapikan kotak: urutkan sudut, batasi 0–1, dan pastikan tidak lebih kecil dari KOTAK_MIN. */
export function rapikanKotak(k: Kotak): Kotak {
  let x1 = batas(Math.min(k.x1, k.x2));
  let x2 = batas(Math.max(k.x1, k.x2));
  let y1 = batas(Math.min(k.y1, k.y2));
  let y2 = batas(Math.max(k.y1, k.y2));
  if (x2 - x1 < KOTAK_MIN) [x1, x2] = x1 + KOTAK_MIN <= 1 ? [x1, x1 + KOTAK_MIN] : [1 - KOTAK_MIN, 1];
  if (y2 - y1 < KOTAK_MIN) [y1, y2] = y1 + KOTAK_MIN <= 1 ? [y1, y1 + KOTAK_MIN] : [1 - KOTAK_MIN, 1];
  return { foto: k.foto, x1, y1, x2, y2 };
}

/** Kotak bawaan kalau AI tidak memberi usulan: bagian tengah foto. */
export const kotakTengah = (foto: number): Kotak => ({ foto, x1: 0.15, y1: 0.25, x2: 0.85, y2: 0.65 });

/**
 * Usulan kotak dari AI: `{foto: 1.., x1, y1, x2, y2}` dalam skala 0–1000.
 * Tidak valid (foto di luar jumlah, kotak terbalik/terlalu kecil/semua nol) → null.
 */
export function kotakDariAi(raw: unknown, jumlahFoto: number): Kotak | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const angka = ["foto", "x1", "y1", "x2", "y2"].map((k) => r[k]);
  if (!angka.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const [foto, x1, y1, x2, y2] = angka as number[];
  if (!Number.isInteger(foto) || foto < 1 || foto > jumlahFoto) return null;
  if ([x1, y1, x2, y2].some((v) => v < 0 || v > 1000)) return null;
  if (x2 - x1 < KOTAK_MIN * 1000 || y2 - y1 < KOTAK_MIN * 1000) return null;
  return { foto: foto - 1, x1: x1 / 1000, y1: y1 / 1000, x2: x2 / 1000, y2: y2 / 1000 };
}

/** Geser kotak sejauh (dx, dy) tanpa keluar dari foto. */
export function geserKotak(k: Kotak, dx: number, dy: number): Kotak {
  const w = k.x2 - k.x1;
  const h = k.y2 - k.y1;
  const x1 = Math.min(1 - w, Math.max(0, k.x1 + dx));
  const y1 = Math.min(1 - h, Math.max(0, k.y1 + dy));
  return { ...k, x1, y1, x2: x1 + w, y2: y1 + h };
}

export type Sudut = "kiri-atas" | "kanan-atas" | "kiri-bawah" | "kanan-bawah";

/** Ubah ukuran dengan menarik satu sudut; sudut seberang tetap. Tidak bisa lebih kecil dari KOTAK_MIN. */
export function tarikSudut(k: Kotak, sudut: Sudut, x: number, y: number): Kotak {
  const b = { ...k };
  const kiri = sudut.startsWith("kiri");
  const atas = sudut.endsWith("atas");
  if (kiri) b.x1 = Math.min(batas(x), k.x2 - KOTAK_MIN);
  else b.x2 = Math.max(batas(x), k.x1 + KOTAK_MIN);
  if (atas) b.y1 = Math.min(batas(y), k.y2 - KOTAK_MIN);
  else b.y2 = Math.max(batas(y), k.y1 + KOTAK_MIN);
  return b;
}

/** Id gambar yang dipakai soal-soal sebuah paket (tanpa duplikat). */
export const gambarDipakai = (soal: { gambarId?: string }[]) => [...new Set(soal.map((q) => q.gambarId).filter((x): x is string => Boolean(x)))];
