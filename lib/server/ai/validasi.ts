import "server-only";

import { randomInt } from "node:crypto";
import { z } from "zod";
import type { Soal } from "@/lib/soal";
import { kotakDariAi, type Kotak } from "@/lib/gambarSoal";
import {
  POIN_HURUF_MAKS,
  POIN_PELENGKAP_MAKS,
  POIN_WAJIB_MAKS,
  SOAL_PER_PAKET_MAKS,
  soalPilihanSchema,
  type SoalPilihan,
} from "@/lib/soalPilihan";

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

/**
 * Satu soal dari AI (rapikan/baca foto) → bentuk `SoalPilihan`.
 * Soal esai: kunci dikumpulkan di `esai`; poin wajib maks 2, pelengkap maks 3.
 */
function dariAi(item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const { jenis, contohJawaban, poinWajib, poinPelengkap, ...x } = item as Record<string, unknown>;
  const daftar = (v: unknown, n: number) =>
    (Array.isArray(v) ? v : []).filter((t): t is string => typeof t === "string" && t.trim() !== "").slice(0, n);
  if (jenis !== "esai") return x;
  const contoh = typeof contohJawaban === "string" ? contohJawaban.trim() : "";
  let wajib = daftar(poinWajib, POIN_WAJIB_MAKS);
  if (!wajib.length && contoh) wajib = [contoh.slice(0, POIN_HURUF_MAKS)];
  return {
    ...x,
    options: [],
    answer: 0,
    optionsAdded: false,
    jenis: "esai",
    esai: { contoh, wajib, pelengkap: daftar(poinPelengkap, POIN_PELENGKAP_MAKS) },
  };
}

/** Hasil merapikan teks admin: buang item tidak valid, urutan pilihan dipertahankan (tidak diacak). */
export function saringRapikan(mentah: unknown): SoalPilihan[] {
  return saringDenganKotak(mentah, 0).map((x) => x.soal);
}

/**
 * Seperti `saringRapikan`, ditambah usulan kotak gambar per soal dari baca foto
 * (hanya untuk soal `perluGambar`; tidak ikut disimpan di paket).
 */
export function saringDenganKotak(mentah: unknown, jumlahFoto: number): { soal: SoalPilihan; kotak: Kotak | null }[] {
  if (!Array.isArray(mentah)) return [];
  const hasil: { soal: SoalPilihan; kotak: Kotak | null }[] = [];
  for (const item of mentah.slice(0, SOAL_PER_PAKET_MAKS)) {
    const h = soalPilihanSchema.safeParse(dariAi(item));
    if (!h.success) continue;
    const kotak = h.data.perluGambar ? kotakDariAi((item as { gambar?: unknown }).gambar, jumlahFoto) : null;
    hasil.push({ soal: h.data, kotak });
  }
  return hasil;
}
