import { z } from "zod";
import { LEVELS } from "./kelas";
import type { HadiahSatu, SumberSoal } from "./latihan";
import type { Rewards } from "./rewards";

/** Satu soal pilihan ganda (brief 6). `answer` = indeks dari 0. */
export type Soal = { q: string; options: string[]; answer: number; explain: string };
/** Soal yang dikirim ke browser: tanpa kunci dan penjelasan sebelum anak menjawab. */
export type SoalTanpaKunci = { q: string; options: string[] };

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
  soal: SoalTanpaKunci[];
};

export const jawabSchema = z
  .object({
    pemainId: z.string().min(1).max(128),
    nomor: z.number().int().min(0).max(19),
    pilihan: z.number().int().min(0).max(3),
  })
  .strict();
export type PermintaanJawab = z.infer<typeof jawabSchema>;

/** Hasil cek satu jawaban. Kunci dan penjelasan baru dikirim setelah anak menjawab. */
export type HasilJawab = {
  benar: boolean;
  pilihan: number;
  answer: number;
  explain: string;
  hadiah: HadiahSatu | null;
  /** Hadiah pemain setelah jawaban ini (sudah tersimpan). */
  rewards: Rewards;
  /** Terisi kalau ini jawaban terakhir dan sesi sudah ditutup. */
  akhir: { benar: number; n: number; bossKalah: boolean } | null;
};
