import { z } from "zod";
import { LEVELS } from "./kelas";
import type { HadiahSatu, SumberSoal } from "./latihan";
import type { HasilEsai } from "./esai";
import type { Rewards } from "./rewards";
import { ESAI_JAWABAN_MAKS, SOAL_PER_PAKET_MAKS, type KunciEsai } from "./soalPilihan";

/**
 * Satu soal (brief 6). Pilihan ganda: `answer` = indeks dari 0.
 * Soal esai (hanya dari soal pilihan orang tua): `jenis: "esai"`, `options` kosong, kunci di `esai`.
 */
export type Soal = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  jenis?: "esai";
  esai?: KunciEsai;
  /** Gambar soal dari foto (hanya soal pilihan orang tua). */
  gambarId?: string;
};
/** Soal yang dikirim ke browser: tanpa kunci dan penjelasan sebelum anak menjawab. */
export type SoalTanpaKunci = { q: string; options: string[]; jenis?: "esai"; gambarId?: string };

export const JUMLAH_SOAL = [5, 10] as const;
export const TOPIK_MAKS = 120;

export const permintaanSoalSchema = z
  .object({
    pemainId: z.string().min(1).max(128),
    mapel: z.string().min(1).max(40),
    topik: z
      .string()
      .transform((s) => s.replace(/\s+/g, " ").trim())
      .pipe(
        z
          .string()
          .min(1, 'Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak".')
          .max(TOPIK_MAKS),
      ),
    level: z.enum(LEVELS as [string, ...string[]]),
    n: z.union([z.literal(5), z.literal(10)]),
  })
  .strict();
export type PermintaanSoal = z.infer<typeof permintaanSoalSchema>;

/** Paket sesi yang dikirim ke browser setelah soal dibuat. */
export type PaketSesi = {
  sesiId: string;
  sumber: SumberSoal;
  mapel: string;
  topik: string;
  level: string;
  /** Paket soal pilihan asal (untuk sumber `set` dan `set_similar`). */
  setId: string | null;
  soal: SoalTanpaKunci[];
};

export const jawabSchema = z
  .object({
    pemainId: z.string().min(1).max(128),
    // Paket terbesar adalah soal pilihan orang tua (maks SOAL_PER_PAKET_MAKS), bukan paket AI (maks 10).
    nomor: z.number().int().min(0).max(SOAL_PER_PAKET_MAKS - 1),
    pilihan: z.number().int().min(0).max(3).optional(),
    /** Jawaban soal esai. */
    teks: z.string().max(ESAI_JAWABAN_MAKS, `Jawaban maksimal ${ESAI_JAWABAN_MAKS} huruf.`).optional(),
  })
  .strict()
  .refine((j) => (j.pilihan === undefined) !== (j.teks === undefined), "Jawaban tidak dikenal.");
export type PermintaanJawab = z.infer<typeof jawabSchema>;

/** Hasil cek satu jawaban. Kunci dan penjelasan baru dikirim setelah anak menjawab. */
export type HasilJawab = {
  benar: boolean;
  /** Pilihan anak; -1 untuk soal esai. */
  pilihan: number;
  /** Kunci; -1 untuk soal esai. */
  answer: number;
  /** Hasil pemeriksaan soal esai (per poin). */
  esai?: HasilEsai;
  explain: string;
  hadiah: HadiahSatu | null;
  /** Hadiah pemain setelah jawaban ini (sudah tersimpan). */
  rewards: Rewards;
  /** Terisi kalau ini jawaban terakhir dan sesi sudah ditutup. */
  akhir: { benar: number; n: number; bossKalah: boolean } | null;
};
