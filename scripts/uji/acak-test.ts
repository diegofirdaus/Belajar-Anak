// Uji acak posisi jawaban soal pilihan (STATUS "BERIKUTNYA" no. 1).
// Jalankan: npx tsx scripts/uji/acak-test.ts
import { randomInt } from "node:crypto";
import { acakSoalPilihan, kunciSebelumnya, merujukPilihanLain } from "../../lib/acakPilihan";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };
const acak = (n: number) => randomInt(n);

/* ---------- Pengecualian otomatis ---------- */
const merujuk = [
  ["Kucing", "Anjing", "Ayam", "Semua benar"],
  ["1", "2", "3", "Semua salah"],
  ["x", "y", "z", "Semuanya benar"],
  ["x", "y", "z", "Semua jawaban benar"],
  ["x", "y", "z", "Semua jawaban di atas benar"],
  ["x", "y", "z", "Semua di atas"],
  ["x", "y", "z", "Tidak ada yang benar"],
  ["x", "y", "z", "Tidak ada jawaban yang tepat"],
  ["x", "y", "z", "Bukan salah satu di atas"],
  ["x", "y", "A dan B benar", "z"],
  ["x", "y", "z", "a, b, dan c"],
  ["x", "y", "z", "(a) dan (c)"],
  ["x", "y", "z", "B atau C"],
  ["x", "y", "Jawaban A dan C benar", "z"],
  ["x", "y", "z", "All of the above"],
  ["x", "y", "z", "None of the above"],
];
for (const o of merujuk) ok(merujukPilihanLain(o), `merujuk: "${o.find((x) => x.length > 1 && !/^[xyz0-9]$/.test(x)) ?? o[3]}"`);

const biasa = [
  ["Semua hewan bernapas", "Burung terbang di atas awan", "Tidak ada air", "Ayam"],
  ["3/4", "1", "a + b", "2a"],
  ["Pilihan ganda", "Daun", "Akar", "Batang"],
  ["Ibu dan ayah", "Kakak", "Adik", "Nenek"],
  ["Jakarta dan Bandung", "Surabaya", "Medan", "Bali"],
  ["Bab di atas meja", "Tidak", "Ya", "Mungkin"],
];
for (const o of biasa) ok(!merujukPilihanLain(o), `tidak merujuk: ${o.join(" | ")}`);

const sr = { q: "Hewan apa?", options: ["Kucing", "Anjing", "Ayam", "Semua benar"], answer: 3, explain: "" };
ok(acakSoalPilihan(sr, acak) === sr, "soal dengan rujukan dikembalikan apa adanya");

/* ---------- Acak ---------- */
const s = { q: "2 + 2 = ?", options: ["3", "4", "5", "6"], answer: 1, explain: "Dua tambah dua.", keyGuessed: false };
const posisi = new Set<number>();
let tetapUtuh = true;
for (let i = 0; i < 400; i++) {
  const h = acakSoalPilihan(s, acak);
  posisi.add(h.answer);
  if (h.options[h.answer] !== "4" || [...h.options].sort().join() !== "3,4,5,6" || h.q !== s.q || h.explain !== s.explain || h.keyGuessed !== false) tetapUtuh = false;
}
ok(tetapUtuh, "kunci tetap jawaban yang sama; pilihan, soal, penjelasan tidak hilang");
ok(posisi.size === 4, "kunci bisa di A, B, C, D", [...posisi]);
ok(s.options.join() === "3,4,5,6" && s.answer === 1, "soal asli tidak diubah");

let selaluBeda = true;
for (let lama = 0; lama < 4; lama++) for (let i = 0; i < 200; i++) if (acakSoalPilihan(s, acak, lama).answer === lama) selaluBeda = false;
ok(selaluBeda, "posisi kunci selalu berbeda dari percobaan sebelumnya");

const dua = { options: ["Benar", "Salah"], answer: 0 };
let duaOk = true;
for (let i = 0; i < 50; i++) { const h = acakSoalPilihan(dua, acak, 0); if (h.answer !== 1 || h.options.join() !== "Salah,Benar") duaOk = false; }
ok(duaOk, "2 pilihan: kunci pindah ke posisi lain");

const tiga = { options: ["p", "q", "r"], answer: 2 };
const posTiga = new Set<number>();
for (let i = 0; i < 200; i++) { const h = acakSoalPilihan(tiga, acak, 1); posTiga.add(h.answer); if (h.options[h.answer] !== "r") posTiga.add(99); }
ok([...posTiga].sort().join() === "0,2", "3 pilihan: kunci di posisi selain yang lama", [...posTiga]);

/* ---------- Kunci sebelumnya ---------- */
const paket = [{ q: "Satu?" }, { q: "Dua?" }, { q: "Tiga?" }, { q: "Baru?" }];
ok(kunciSebelumnya(paket, null).every((x) => x === null), "belum pernah dikerjakan: tanpa kunci lama");
ok(
  kunciSebelumnya(paket, [{ q: "Dua?", answer: 3 }, { q: "Satu?", answer: 0 }, { q: "Tiga?", answer: 2 }]).join() === "0,3,2,",
  "dicocokkan lewat teks soal; soal baru tanpa kunci lama",
);
ok(kunciSebelumnya([{ q: "Sama?" }, { q: "Sama?" }], [{ q: "Sama?", answer: 1 }, { q: "Sama?", answer: 2 }]).join() === "1,2", "soal kembar: nomor yang sama didahulukan");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
