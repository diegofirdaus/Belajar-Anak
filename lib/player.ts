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
