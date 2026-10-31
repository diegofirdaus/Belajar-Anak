import { z } from "zod";
import { LEVELS } from "./kelas";

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
