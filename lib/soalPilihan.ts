// Soal pilihan dari orang tua (brief 6 `question_sets`, 7.8). Dipakai server dan browser.
import { z } from "zod";
import { MAPEL, jenjangOf, kelasShort } from "./kelas";

export const JUDUL_MAKS = 60;
export const TEKS_ADMIN_MAKS = 20_000;
export const SOAL_PER_PAKET_MAKS = 50;
export const PAKET_MAKS = 100;

/** Batas soal esai (STATUS "BERIKUTNYA" no. 2). */
export const ESAI_JAWABAN_MAKS = 500;
export const POIN_WAJIB_MAKS = 2;
export const POIN_PELENGKAP_MAKS = 3;
export const POIN_HURUF_MAKS = 200;

/** Kunci soal esai: contoh jawaban, poin wajib (1–2, harus ada), poin pelengkap (boleh tidak ada). */
export type KunciEsai = { contoh: string; wajib: string[]; pelengkap: string[] };

/**
 * Satu soal pilihan orang tua. Pilihan ganda: `options` 2–4 (soal yang dibaca tanpa AI boleh kurang dari 4).
 * Esai (`jenis: "esai"`): `options` kosong, `answer` 0 (tidak dipakai), kunci di `esai`.
 */
export type SoalPilihan = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  keyGuessed: boolean;
  optionsAdded: boolean;
  /** Dari foto: soal bergantung pada gambar/diagram yang tidak bisa ditampilkan. */
  perluGambar?: boolean;
  jenis?: "esai";
  esai?: KunciEsai;
};

const teks = (maks: number) => z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(maks));

export const esaiSchema = z
  .object({
    contoh: z.string().max(2000).transform((s) => s.trim()),
    wajib: z.array(teks(POIN_HURUF_MAKS)).min(1, "Soal esai butuh minimal 1 poin wajib.").max(POIN_WAJIB_MAKS),
    pelengkap: z.array(teks(POIN_HURUF_MAKS)).max(POIN_PELENGKAP_MAKS),
  })
  .strict();

export type PaketPilihan = {
  id: string;
  title: string;
  kelas: number;
  subject: string;
  sourceText: string;
  questions: SoalPilihan[];
  /** Acak urutan pilihan setiap kali dikerjakan (bawaan menyala; paket lama tanpa field = menyala). */
  acakPilihan: boolean;
  createdAt: string;
  updatedAt: string;
};


export const soalPilihanSchema = z
  .object({
    q: teks(2000),
    options: z.array(teks(500)).max(4),
    answer: z.number().int().min(0).max(3),
    explain: z.string().max(2000).transform((s) => s.trim()),
    keyGuessed: z.boolean(),
    optionsAdded: z.boolean(),
    perluGambar: z.boolean().optional(),
    jenis: z.literal("esai").optional(),
    esai: esaiSchema.optional(),
  })
  .superRefine((s, ctx) => {
    if (s.jenis === "esai") {
      if (s.options.length) ctx.addIssue({ code: "custom", message: "Soal esai tidak punya pilihan jawaban." });
      if (!s.esai) ctx.addIssue({ code: "custom", message: "Soal esai butuh contoh jawaban dan poin wajib." });
      return;
    }
    if (s.esai) ctx.addIssue({ code: "custom", message: "Kunci esai hanya untuk soal esai." });
    if (s.options.length < 2) ctx.addIssue({ code: "custom", message: "Soal pilihan ganda butuh minimal 2 pilihan." });
    else if (s.answer >= s.options.length) ctx.addIssue({ code: "custom", message: "Kunci jawaban di luar pilihan." });
  });

export const adalahEsai = (q: { jenis?: string }) => q.jenis === "esai";

export const paketSchema = z
  .object({
    title: z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(JUDUL_MAKS)),
    kelas: z.number().int().min(1).max(12),
    subject: z.string().min(1).max(40),
    sourceText: z.string().max(TEKS_ADMIN_MAKS),
    questions: z.array(soalPilihanSchema).min(1, "Belum ada soal yang bisa disimpan.").max(SOAL_PER_PAKET_MAKS),
    acakPilihan: z.boolean().default(true),
  })
  .strict()
  .refine((p) => MAPEL[jenjangOf(p.kelas)].includes(p.subject), "Mata pelajaran tidak tersedia untuk kelas ini.");
export type PaketBaru = z.infer<typeof paketSchema>;

export const rapikanSchema = z
  .object({
    kelas: z.number().int().min(1).max(12),
    mapel: z.string().min(1).max(40),
    teks: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Ketik atau tempel soalnya dulu, ya.").max(TEKS_ADMIN_MAKS, "Teks soal terlalu panjang (maksimal 20.000 karakter).")),
  })
  .strict();

export const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, "PIN harus 4 angka.") }).strict();

/** Judul bawaan kalau kosong: "{Mapel} Kelas {k} {Jenjang}". */
export const judulBawaan = (mapel: string, kelas: number) => `${mapel} ${kelasShort(kelas)}`;

/**
 * Cadangan tanpa AI (brief 7.8): baris `1.` / `1)` memulai soal, `A.` / `a)` pilihan (maks 4),
 * `Kunci: B` / `Jawaban: B` kunci. Baris lain menyambung ke soal atau pilihan terakhir.
 */
export function bacaManual(teksAsli: string): { soal: SoalPilihan[]; galat: string[] } {
  const soal: SoalPilihan[] = [];
  const galat: string[] = [];
  let kini: { no: string; q: string; options: string[]; kunci: string | null } | null = null;

  const simpan = () => {
    if (!kini) return;
    const jawaban = kini.kunci ? "ABCD".indexOf(kini.kunci) : -1;
    if (kini.options.length < 2) galat.push(`Soal nomor ${kini.no} belum punya pilihan A, B, dan seterusnya.`);
    else if (jawaban < 0 || jawaban >= kini.options.length) galat.push(`Soal nomor ${kini.no} belum punya baris "Kunci: ...".`);
    else
      soal.push({
        q: kini.q.trim(),
        options: kini.options.map((o) => o.trim()),
        answer: jawaban,
        explain: "",
        keyGuessed: false,
        optionsAdded: false,
      });
    kini = null;
  };

  for (const baris of teksAsli.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    let m: RegExpMatchArray | null;
    if ((m = baris.match(/^(?:kunci|jawaban|jawab)\s*(?:jawaban)?\s*[:=]?\s*([A-Da-d])\b/i))) {
      if (kini) kini.kunci = m[1].toUpperCase();
      continue;
    }
    if ((m = baris.match(/^(\d+)\s*[.)]\s*(.+)$/))) {
      simpan();
      kini = { no: m[1], q: m[2], options: [], kunci: null };
      continue;
    }
    if (kini && (m = baris.match(/^([A-Da-d])\s*[.)]\s*(.+)$/))) {
      if (kini.options.length < 4) kini.options.push(m[2]);
      continue;
    }
    if (kini) {
      if (kini.options.length) kini.options[kini.options.length - 1] += " " + baris;
      else kini.q += " " + baris;
    }
  }
  simpan();
  return { soal, galat };
}

/** Yang dilihat anak tentang satu paket: tanpa soal dan kunci. */
export type PaketRingkas = { id: string; title: string; subject: string; n: number };

/** "Buat soal mirip" membuat min(10, max(5, jumlah soal paket)) soal (brief 9.4). */
export const jumlahSoalMirip = (n: number) => Math.min(10, Math.max(5, n));

/** Foto soal (brief roadmap 1, dimajukan): maks 5 foto, sudah diperkecil di browser. Foto tidak disimpan. */
export const FOTO_MAKS = 5;
/** Batas panjang base64 per foto dan total (batas kiriman Vercel ±4,5 MB). */
export const FOTO_BASE64_MAKS = 1_600_000;
export const FOTO_TOTAL_MAKS = 4_200_000;

export const bacaFotoSchema = z
  .object({
    kelas: z.number().int().min(1).max(12),
    mapel: z.string().min(1).max(40),
    gambar: z
      .array(
        z
          .object({
            media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
            data: z.string().min(100).max(FOTO_BASE64_MAKS).regex(/^[A-Za-z0-9+/]+={0,2}$/),
          })
          .strict(),
      )
      .min(1, "Pilih foto soalnya dulu, ya.")
      .max(FOTO_MAKS, `Maksimal ${FOTO_MAKS} foto sekali unggah.`)
      .refine((g) => g.reduce((a, x) => a + x.data.length, 0) <= FOTO_TOTAL_MAKS, "Foto terlalu besar. Coba kirim lebih sedikit foto sekaligus."),
  })
  .strict();
