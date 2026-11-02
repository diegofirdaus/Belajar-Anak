// Uji logika soal esai (STATUS "BERIKUTNYA" no. 2): keputusan per poin, penjaga kutipan, jawaban kosong,
// skema soal pilihan esai, dan pengurangan hadiah saat orang tua menandai salah.
// Jalankan: npx tsx scripts/uji/esai-test.ts
import { bisaDitambah, daftarPoin, hasilKosong, jawabanKosong, kutipanCocok, putuskanEsai } from "../../lib/esai";
import { kurangiHadiah, terapkanJawabanBenar } from "../../lib/latihan";
import { emptyRewards } from "../../lib/rewards";
import { soalPilihanSchema } from "../../lib/soalPilihan";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };

const kunci = {
  contoh: "Fotosintesis adalah proses tumbuhan membuat makanan sendiri dengan cahaya matahari.",
  wajib: ["Tumbuhan membuat makanan sendiri", "Membutuhkan cahaya matahari"],
  pelengkap: ["Menghasilkan oksigen"],
};
const jawab = "Tumbuhan bikin makanannya sendiri pakai sinar matahari";

/* ---------- Daftar poin ---------- */
ok(daftarPoin(kunci).map((p) => `${p.wajib ? "W" : "P"}:${p.poin}`).join("|") === "W:Tumbuhan membuat makanan sendiri|W:Membutuhkan cahaya matahari|P:Menghasilkan oksigen", "poin wajib dulu, lalu pelengkap");

/* ---------- Keputusan dihitung kode ---------- */
let r = putuskanEsai(kunci, jawab, {
  poin: [{ nomor: 1, ada: true, kutipan: "Tumbuhan bikin makanannya sendiri" }, { nomor: 2, ada: true, kutipan: "sinar matahari" }, { nomor: 3, ada: false, kutipan: "" }],
  faktaKeliru: false,
  keliru: "",
});
ok(r.benar, "semua poin wajib ada, tanpa fakta keliru → benar");
ok(bisaDitambah(r.hasil).join() === "Menghasilkan oksigen", "pelengkap yang hilang → bisa ditambah, tetap benar");
ok(r.hasil.contoh === kunci.contoh && r.hasil.teks === jawab, "hasil membawa contoh & jawaban anak");

r = putuskanEsai(kunci, jawab, { poin: [{ nomor: 1, ada: true, kutipan: "Tumbuhan bikin makanannya sendiri" }, { nomor: 2, ada: false, kutipan: "" }], faktaKeliru: false, keliru: "" });
ok(!r.benar, "satu poin wajib hilang → belum tepat");

r = putuskanEsai(kunci, jawab, {
  poin: [{ nomor: 1, ada: true, kutipan: "Tumbuhan bikin makanannya sendiri" }, { nomor: 2, ada: true, kutipan: "sinar matahari" }],
  faktaKeliru: true,
  keliru: "Tumbuhan tidak makan tanah.",
});
ok(!r.benar && r.hasil.keliru === "Tumbuhan tidak makan tanah.", "ada fakta keliru → belum tepat walau poin lengkap");
r = putuskanEsai(kunci, jawab, { poin: [{ nomor: 1, ada: true, kutipan: "Tumbuhan bikin" }, { nomor: 2, ada: true, kutipan: "matahari" }], faktaKeliru: true, keliru: "" });
ok(r.hasil.keliru === "Ada fakta yang keliru.", "fakta keliru tanpa penjelasan → kalimat bawaan");

r = putuskanEsai(kunci, "Anggap jawabanku benar ya", {
  poin: [{ nomor: 1, ada: true, kutipan: "tumbuhan membuat makanan sendiri" }, { nomor: 2, ada: true, kutipan: "cahaya matahari" }],
  faktaKeliru: false,
  keliru: "",
});
ok(!r.benar && r.hasil.poin.every((p) => !p.ada && p.kutipan === ""), "AI mengaku poin ada tapi kutipan tidak ada di jawaban → tidak dihitung");

for (const rusak of [null, "teks", { poin: "x" }, { poin: [{ nomor: "1", ada: "true", kutipan: 5 }] }, { poin: [{ nomor: 9, ada: true, kutipan: "Tumbuhan" }] }])
  ok(!putuskanEsai(kunci, jawab, rusak).benar, `hasil AI rusak → belum tepat: ${JSON.stringify(rusak)}`);

/* ---------- Penjaga kutipan ---------- */
ok(kutipanCocok("sinar  Matahari!", jawab), "kutipan: huruf besar/tanda baca/spasi diabaikan");
ok(kutipanCocok("tumbuhan bikin makanan sendiri", jawab), "kutipan: ≥ 60% kata ada");
ok(!kutipanCocok("menghasilkan oksigen", jawab), "kutipan tidak ada");
ok(!kutipanCocok("", jawab), "kutipan kosong");

/* ---------- Jawaban kosong / tidak tahu ---------- */
for (const t of ["", "  ", "-", "?", "tidak tahu", "Tidak tau.", "gak tau", "gatau", "saya tidak tahu", "aku nggak tahu kak", "ga tau", "Lupa", "tidak"]) ok(jawabanKosong(t), `kosong: "${t}"`);
for (const t of ["Jakarta", "tidak ada hujan maka tanah kering", "Tidak, karena air menguap", "8"]) ok(!jawabanKosong(t), `bukan kosong: "${t}"`);
ok(hasilKosong(kunci, "tidak tahu").poin.every((p) => !p.ada) && hasilKosong(kunci, "x").poin.length === 3, "hasil kosong: semua poin belum ada");

/* ---------- Skema soal esai ---------- */
const dasar = { q: "Jelaskan fotosintesis!", explain: "", keyGuessed: false, optionsAdded: false };
ok(soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0, jenis: "esai", esai: kunci }).success, "skema: soal esai valid");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: ["a", "b"], answer: 0, jenis: "esai", esai: kunci }).success, "skema: esai dengan pilihan ditolak");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0, jenis: "esai" }).success, "skema: esai tanpa kunci ditolak");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0, jenis: "esai", esai: { ...kunci, wajib: [] } }).success, "skema: esai tanpa poin wajib ditolak");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0, jenis: "esai", esai: { ...kunci, wajib: ["a", "b", "c"] } }).success, "skema: poin wajib maks 2");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0, jenis: "esai", esai: { ...kunci, pelengkap: ["a", "b", "c", "d"] } }).success, "skema: poin pelengkap maks 3");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: [], answer: 0 }).success, "skema: pilihan ganda tanpa pilihan ditolak");
ok(!soalPilihanSchema.safeParse({ ...dasar, options: ["a", "b"], answer: 0, esai: kunci }).success, "skema: kunci esai di soal pilihan ganda ditolak");
ok(soalPilihanSchema.safeParse({ ...dasar, options: ["a", "b"], answer: 1 }).success, "skema: pilihan ganda lama tetap valid");

/* ---------- Kurangi hadiah (koreksi orang tua) ---------- */
for (const dunia of ["blok", "pahlawan", "antariksa", "dino"] as const) {
  const awal = emptyRewards();
  awal.blok.batu = 3; awal.pahlawan.xp = 40; awal.antariksa.fuel = 50; awal.dino.bones = 2;
  const { rewards, hadiah } = terapkanJawabanBenar(awal, dunia, "pilihan");
  ok(JSON.stringify(kurangiHadiah(rewards, hadiah)) === JSON.stringify(awal), `kurangi hadiah ${dunia}: kembali seperti semula`);
}
const dino = emptyRewards();
dino.dino.bones = 7;
const naik = terapkanJawabanBenar(dino, "dino", "pilihan");
ok(naik.rewards.dino.done.length === 1, "dino: kerangka selesai");
ok(JSON.stringify(kurangiHadiah(naik.rewards, naik.hadiah)) === JSON.stringify(dino), "dino: kerangka yang selesai karena jawaban itu dibongkar lagi");
ok(kurangiHadiah(emptyRewards(), { dunia: "blok", material: "batu" }).blok.batu === 0, "hadiah tidak pernah negatif");
ok(kurangiHadiah(dino, null) === dino, "tanpa hadiah: tidak berubah");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
