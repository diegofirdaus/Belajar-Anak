// Uji pembaca soal manual (cadangan tanpa AI, brief 7.8) dan skema paket.
// Jalankan: npx tsx scripts/uji/admin-test.ts
import { bacaManual, judulBawaan, paketSchema } from "../../lib/soalPilihan";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };

let r = bacaManual(`1. Hasil dari 3/4 + 1/4 adalah...
A. 1/2
B. 1
C. 4/8
D. 2
Kunci: B

2) Ibu punya 12 kue,
dibagi rata ke 4 anak. Tiap anak dapat?
a) 2
b) 3 kue
   utuh
c) 4
Jawaban: b`);
ok(r.soal.length === 2 && r.galat.length === 0, "dua soal terbaca tanpa galat", r);
ok(r.soal[0].options.join("|") === "1/2|1|4/8|2" && r.soal[0].answer === 1, "soal 1: pilihan & kunci B");
ok(r.soal[1].q === "Ibu punya 12 kue, dibagi rata ke 4 anak. Tiap anak dapat?", "baris lanjutan menyambung ke soal", r.soal[1].q);
ok(r.soal[1].options.join("|") === "2|3 kue utuh|4" && r.soal[1].answer === 1, "baris lanjutan menyambung ke pilihan; 3 pilihan boleh; kunci huruf kecil", r.soal[1].options);
ok(r.soal.every((q) => !q.keyGuessed && !q.optionsAdded && q.explain === ""), "tanpa tanda AI");

r = bacaManual(`1. Soal tanpa pilihan?
Kunci: A
2. Soal tanpa kunci
A. satu
B. dua
3. Kunci di luar pilihan
A. x
B. y
Kunci: D
4. Lengkap
A. x
B. y
C. z
D. w
E. lima
Kunci: d`);
ok(r.galat.join(" | ") === 'Soal nomor 1 belum punya pilihan A, B, dan seterusnya. | Soal nomor 2 belum punya baris "Kunci: ...". | Soal nomor 3 belum punya baris "Kunci: ...".', "galat per nomor soal", r.galat);
ok(r.soal.length === 1 && r.soal[0].options.length === 4 && r.soal[0].answer === 3, "pilihan maksimal 4 (E diabaikan)", r.soal[0]);
ok(bacaManual("teks bebas tanpa nomor").soal.length === 0 && bacaManual("teks bebas tanpa nomor").galat.length === 0, "tanpa nomor: tidak ada soal, tidak ada galat");

ok(judulBawaan("Matematika", 7) === "Matematika Kelas 7 SMP", "judul bawaan");
const q = { q: "a?", options: ["x", "y"], answer: 1, explain: "", keyGuessed: false, optionsAdded: false };
ok(paketSchema.safeParse({ title: "", kelas: 5, subject: "Matematika", sourceText: "x", questions: [q] }).success, "paket valid");
ok(!paketSchema.safeParse({ title: "", kelas: 5, subject: "Fisika", sourceText: "x", questions: [q] }).success, "mapel SMA untuk kelas 5 ditolak");
ok(!paketSchema.safeParse({ title: "", kelas: 5, subject: "Matematika", sourceText: "x", questions: [{ ...q, answer: 2 }] }).success, "kunci di luar pilihan ditolak");
ok(!paketSchema.safeParse({ title: "x".repeat(61), kelas: 5, subject: "Matematika", sourceText: "", questions: [q] }).success, "judul > 60 ditolak");
ok(!paketSchema.safeParse({ title: "", kelas: 5, subject: "Matematika", sourceText: "", questions: [] }).success, "paket tanpa soal ditolak");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
