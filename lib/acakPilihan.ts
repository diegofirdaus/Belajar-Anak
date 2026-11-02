// Acak posisi jawaban soal pilihan orang tua (STATUS "BERIKUTNYA" no. 1). Logika murni, dipakai server dan browser.

/** Bilangan acak bulat 0..n-1. Server memakai `crypto.randomInt`. */
export type Acak = (n: number) => number;

const HURUF = "[a-d]";
const POLA_RUJUKAN: RegExp[] = [
  // "Semua benar", "Semuanya salah", "Semua jawaban benar", "Semua pilihan di atas benar"
  /^semua(nya)?\s+((jawaban|pilihan|pernyataan)\s+)?((di\s+)?atas\s+)?(benar|salah|betul|tepat|keliru)\b/,
  // "Semua di atas", "Semua jawaban di atas", "Tidak ada di atas", "Bukan salah satu di atas"
  /^(semua(nya)?|tidak ada|bukan salah satu)(\s+(dari|jawaban|pilihan|pernyataan|yang))*\s+di\s?atas\b/,
  // "Tidak ada yang benar", "Tidak ada jawaban yang tepat", "Tidak satu pun benar"
  /^tidak\s+(ada|satu\s*pun)\b.*\b(benar|betul|tepat)\b/,
  /^bukan\s+salah\s+satu\b/,
  // "A dan B benar", "a, b, dan c", "B atau C", "(a) & (c)"
  new RegExp(`(^|[^\\p{L}])\\(?${HURUF}\\)?(\\s*,\\s*\\(?${HURUF}\\)?)*\\s*,?\\s*(dan|atau|serta|&|and|or)\\s+\\(?${HURUF}\\)?([^\\p{L}]|$)`, "u"),
  // "Jawaban A dan C", "pilihan b benar", "opsi D"
  new RegExp(`\\b(jawaban|pilihan|opsi)\\s+\\(?${HURUF}\\)?([^\\p{L}]|$)`, "u"),
  // Bahasa Inggris
  /\b(all|none|both|neither)\s+(of\s+)?(the\s+)?(above|options|answers)\b/,
  /^(all|none)\s+(are\s+)?(true|correct|false|wrong)\b/,
];

/** Pilihan yang merujuk pilihan lain ("Semua benar", "A dan B benar"): urutannya tidak boleh diubah. */
export function merujukPilihanLain(options: string[]): boolean {
  return options.some((o) => {
    const t = o.toLowerCase().replace(/\s+/g, " ").trim();
    return POLA_RUJUKAN.some((p) => p.test(t));
  });
}

type SoalUrut = { options: string[]; answer: number };

/**
 * Acak urutan pilihan satu soal. Kalau `kunciLama` diketahui (posisi kunci di percobaan sebelumnya),
 * posisi kunci yang baru dijamin berbeda. Soal yang pilihannya merujuk pilihan lain dikembalikan apa adanya.
 */
export function acakSoalPilihan<T extends SoalUrut>(s: T, acak: Acak, kunciLama: number | null = null): T {
  const n = s.options.length;
  if (n < 2 || merujukPilihanLain(s.options)) return s;
  // Posisi kunci: acak di antara posisi selain kunci lama.
  const boleh = Array.from({ length: n }, (_, i) => i).filter((i) => i !== kunciLama);
  const posKunci = boleh[acak(boleh.length)];
  // Pengecoh: acak (Fisher–Yates), lalu isi posisi selain kunci.
  const pengecoh = s.options.filter((_, i) => i !== s.answer);
  for (let i = pengecoh.length - 1; i > 0; i--) {
    const j = acak(i + 1);
    [pengecoh[i], pengecoh[j]] = [pengecoh[j], pengecoh[i]];
  }
  const options = Array.from({ length: n }, (_, i) => (i === posKunci ? s.options[s.answer] : pengecoh.shift()!));
  return { ...s, options, answer: posKunci };
}

/**
 * Posisi kunci di percobaan sebelumnya, per soal paket. Dicocokkan lewat teks soal
 * (nomor yang sama didahulukan), supaya tetap benar walau paket sudah diubah orang tua.
 */
export function kunciSebelumnya(soal: { q: string }[], lama: { q: string; answer: number }[] | null): (number | null)[] {
  if (!lama?.length) return soal.map(() => null);
  return soal.map((s, i) => {
    if (lama[i]?.q === s.q) return lama[i].answer;
    return lama.find((x) => x.q === s.q)?.answer ?? null;
  });
}
