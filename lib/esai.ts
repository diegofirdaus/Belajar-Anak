// Soal esai pada soal pilihan orang tua (STATUS "BERIKUTNYA" no. 2). Logika murni, dipakai server dan browser.
// AI hanya menilai per poin (ada/tidak + kutipan + fakta keliru). Keputusan benar/belum tepat dihitung di sini.
import type { KunciEsai } from "./soalPilihan";

export type HasilPoin = { poin: string; wajib: boolean; ada: boolean; kutipan: string };
export type HasilEsai = {
  /** Jawaban anak. */
  teks: string;
  poin: HasilPoin[];
  /** Penjelasan singkat fakta yang keliru, atau null. */
  keliru: string | null;
  contoh: string;
  /** Diisi kalau orang tua mengoreksi hasilnya di dashboard. */
  koreksi?: boolean;
};

/** Daftar poin yang dikirim ke AI, berurutan: wajib dulu, lalu pelengkap. Nomor mulai 1. */
export const daftarPoin = (k: KunciEsai) => [
  ...k.wajib.map((poin) => ({ poin, wajib: true })),
  ...k.pelengkap.map((poin) => ({ poin, wajib: false })),
];

const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Kosong (tanpa huruf/angka) atau "tidak tahu": langsung belum tepat tanpa memanggil AI. */
export function jawabanKosong(teks: string): boolean {
  const t = normal(teks);
  if (!t) return true;
  return (
    /^(saya |aku )?(tidak|tdk|gak|ga|nggak|ngga|enggak|ndak|belum) ?(tahu|tau|tw|ngerti|mengerti|paham)( kak| bu| pak| ma| pa)?$/.test(t) ||
    /^(gatau|gtw|entah|lupa|tidak|gak|ga|nggak|belum|kosong)$/.test(t)
  );
}

/**
 * Kutipan dari AI harus memang ada di jawaban anak (penjaga kalau AI mengarang).
 * Cocok kalau kutipan (dinormalkan) ada di jawaban, atau ≥ 60% katanya ada di jawaban.
 */
export function kutipanCocok(kutipan: string, teks: string): boolean {
  const k = normal(kutipan);
  const t = normal(teks);
  if (!k) return false;
  if (t.includes(k)) return true;
  const kataJawaban = new Set(t.split(" "));
  const kata = k.split(" ").filter((w) => w.length > 1);
  if (!kata.length) return false;
  return kata.filter((w) => kataJawaban.has(w)).length / kata.length >= 0.6;
}

type PoinAi = { nomor?: unknown; ada?: unknown; kutipan?: unknown };

/**
 * Keputusan akhir dari hasil AI (STATUS no. 2): **Benar** = semua poin wajib ada DAN tidak ada fakta keliru.
 * Poin yang dinilai "ada" tanpa kutipan yang cocok dengan jawaban anak dianggap tidak ada.
 * Hasil AI yang tidak lengkap/rusak membuat poin itu dianggap tidak ada (aman: belum tepat).
 */
export function putuskanEsai(kunci: KunciEsai, teks: string, ai: unknown): { benar: boolean; hasil: HasilEsai } {
  const data = (ai ?? {}) as { poin?: unknown; faktaKeliru?: unknown; keliru?: unknown };
  const dariAi = Array.isArray(data.poin) ? (data.poin as PoinAi[]) : [];
  const poin: HasilPoin[] = daftarPoin(kunci).map((p, i) => {
    const x = dariAi.find((d) => d?.nomor === i + 1);
    const kutipan = typeof x?.kutipan === "string" ? x.kutipan.trim().slice(0, 300) : "";
    const ada = x?.ada === true && kutipanCocok(kutipan, teks);
    return { ...p, ada, kutipan: ada ? kutipan : "" };
  });
  const keliru =
    data.faktaKeliru === true ? (typeof data.keliru === "string" && data.keliru.trim() ? data.keliru.trim().slice(0, 300) : "Ada fakta yang keliru.") : null;
  const benar = poin.filter((p) => p.wajib).every((p) => p.ada) && !keliru;
  return { benar, hasil: { teks, poin, keliru, contoh: kunci.contoh } };
}

/** Hasil untuk jawaban kosong / "tidak tahu" (tanpa AI). */
export function hasilKosong(kunci: KunciEsai, teks: string): HasilEsai {
  return { teks, poin: daftarPoin(kunci).map((p) => ({ ...p, ada: false, kutipan: "" })), keliru: null, contoh: kunci.contoh };
}

/** Poin pelengkap yang belum disebut: "Bisa ditambah: …". */
export const bisaDitambah = (h: HasilEsai) => h.poin.filter((p) => !p.wajib && !p.ada).map((p) => p.poin);

/** Satu soal di detail latihan untuk orang tua. Soal esai membawa jawaban anak dan hasil per poin. */
export type DetailSoal = {
  q: string;
  options: string[];
  answer: number;
  pilihan: number | null;
  jenis?: "esai";
  benar?: boolean;
  esai?: HasilEsai | null;
};
