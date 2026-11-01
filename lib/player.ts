import { z } from "zod";
import { WORLD_IDS, type WorldId } from "./worlds";
import type { Rewards } from "./rewards";

export const MAX_PLAYERS = 10;

/** Profil anak sesuai bagian 6 brief. Tanpa data pribadi selain nama panggilan dan kelas. */
export type Player = {
  id: string;
  name: string;
  kelas: number;
  theme: WorldId;
  academicYear: number;
  rewards: Rewards;
  createdAt: string;
};

export const playerName = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Tulis dulu nama panggilanmu, ya.").max(20));

export const newPlayerSchema = z.object({
  name: playerName,
  kelas: z.number().int().min(1).max(12),
  theme: z.enum(WORLD_IDS),
});
export type NewPlayer = z.infer<typeof newPlayerSchema>;

/** Perubahan profil dari Pengaturan dan kartu naik kelas. */
export const updatePlayerSchema = z
  .object({
    name: playerName.optional(),
    kelas: z.number().int().min(1).max(12).optional(),
    theme: z.enum(WORLD_IDS).optional(),
    /** "Belum naik kelas" / "Oke": tahun ajaran dikonfirmasi tanpa mengubah kelas. */
    konfirmasiTahunAjaran: z.literal(true).optional(),
  })
  .strict()
  .refine((u) => Object.keys(u).length > 0, "Tidak ada yang diubah.");
export type PlayerUpdate = z.infer<typeof updatePlayerSchema>;
