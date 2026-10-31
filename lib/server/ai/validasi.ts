import "server-only";

import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Soal } from "@/lib/soal";

const teks = z.string().transform((s) => s.trim()).pipe(z.string().min(1));

const soalAi = z
  .object({
    q: teks,
    options: z.array(teks).length(4),
    answer: z.number().int().min(0).max(3),
    explain: z.string().transform((s) => s.trim()),
  })
  .refine((s) => new Set(s.options.map((o) => o.toLowerCase())).size === 4, "pilihan kembar");

/** Acak urutan pilihan supaya posisi kunci benar-benar tersebar (brief 10.4). */
export function acakPilihan(s: Soal): Soal {
  const urut = s.options.map((o, i) => ({ o, benar: i === s.answer }));
  for (let i = urut.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [urut[i], urut[j]] = [urut[j], urut[i]];
  }
  return { ...s, options: urut.map((x) => x.o), answer: urut.findIndex((x) => x.benar) };
}

/**
 * Brief 10.4: harus array; buang item yang tidak valid; ambil maksimal n;
 * kalau soal valid kurang dari min(3, n), anggap gagal (null).
 */
export function saringSoal(mentah: unknown, n: number): Soal[] | null {
  const daftar = Array.isArray(mentah) ? mentah : null;
  if (!daftar) return null;
  const valid: Soal[] = [];
  for (const item of daftar) {
    const h = soalAi.safeParse(item);
    if (h.success) valid.push(acakPilihan(h.data));
    if (valid.length === n) break;
  }
  return valid.length >= Math.min(3, n) ? valid : null;
}
