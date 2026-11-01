// Uji logika sesi latihan (tahap 7): hadiah per jawaban, akhir sesi, ringkasan hasil, pesan, saran.
// Jalankan: npx tsx scripts/uji/latihan-test.ts
import { emptyRewards } from "../../lib/rewards";
import {
  hitungSaran, kunciTopik, pesanHasil, ringkasHasil, tanpaAkhiranContoh, tanggalPendek,
  teksHadiahSatu, terapkanAkhirSesi, terapkanJawabanBenar, type StatTopik,
} from "../../lib/latihan";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };

// Blok
let r = emptyRewards();
let h = terapkanJawabanBenar(r, "blok", "sulit");
ok(h.rewards.blok.permata === 1 && r.blok.permata === 0, "blok: sulit +1 permata, objek lama tidak berubah");
ok(teksHadiahSatu(h.hadiah) === "+1 permata", "teks hadiah blok");
ok(terapkanJawabanBenar(r, "blok", "pilihan").rewards.blok.batu === 1, "soal pilihan setara sedang (batu)");

// Pahlawan
h = terapkanJawabanBenar(r, "pahlawan", "sedang");
ok(h.rewards.pahlawan.xp === 20 && teksHadiahSatu(h.hadiah) === "+20 XP · serangan kena!", "pahlawan: sedang +20 XP");
let a = terapkanAkhirSesi({ ...r, pahlawan: { xp: 90, bosses: 0 } }, "pahlawan", 4, 5);
ok(a.bossKalah && a.rewards.pahlawan.xp === 105 && a.rewards.pahlawan.bosses === 1, "boss kalah 4/5 (ceil 3,5=4): +15 XP, +1 boss");
a = terapkanAkhirSesi(r, "pahlawan", 3, 5);
ok(!a.bossKalah && a.rewards.pahlawan.xp === 0, "3/5 boss bertahan");
ok(terapkanAkhirSesi(r, "pahlawan", 7, 10).bossKalah, "7/10 boss kalah");
ok(!terapkanAkhirSesi(r, "blok", 5, 5).bossKalah, "dunia lain tanpa boss");

// Antariksa
h = terapkanJawabanBenar(r, "antariksa", "mudah");
ok(h.rewards.antariksa.fuel === 10 && teksHadiahSatu(h.hadiah) === "+10 liter bahan bakar", "antariksa: mudah +10 liter");

// Dino
let d = { ...emptyRewards(), dino: { bones: 6, done: [] as string[] } };
h = terapkanJawabanBenar(d, "dino", "sulit");
ok(h.rewards.dino.bones === 1 && h.rewards.dino.done.join() === "T-Rex", "dino: 6+3 tulang = kerangka T-Rex + sisa 1");
ok(h.hadiah.dunia === "dino" && h.hadiah.kerangkaBaru.join() === "T-Rex", "kerangka baru dilaporkan");
d = { ...emptyRewards(), dino: { bones: 7, done: ["T-Rex"] } };
ok(terapkanJawabanBenar(d, "dino", "mudah").rewards.dino.done.join() === "T-Rex,Triceratops", "urutan dino berputar");

// Ringkasan hasil
const awal = emptyRewards();
let akhir = { ...emptyRewards(), blok: { kayu: 2, batu: 1, permata: 0 } };
let s = ringkasHasil({ dunia: "blok", awal, akhir, benar: 4, n: 5, bossKalah: false });
ok(s.banner === "Misi berhasil!" && s.hadiah === "+2 kayu · +1 batu" && s.menang, "hasil blok 80%", s);
ok(ringkasHasil({ dunia: "blok", awal, akhir, benar: 3, n: 5, bossKalah: false }).banner === "Hampir sempurna!", "blok 60%");
ok(ringkasHasil({ dunia: "blok", awal, akhir: awal, benar: 2, n: 5, bossKalah: false }).banner === "Terus menambang!", "blok <60%");
akhir = { ...emptyRewards(), pahlawan: { xp: 105, bosses: 1 } };
s = ringkasHasil({ dunia: "pahlawan", awal: { ...awal, pahlawan: { xp: 30, bosses: 0 } }, akhir, benar: 4, n: 5, bossKalah: true });
ok(s.banner === "Victory! Boss tumbang" && s.hadiah === "+75 XP (termasuk bonus boss)" && s.tambahan === "Naik rank! Sekarang kamu Ksatria.", "hasil pahlawan + naik rank", s);
s = ringkasHasil({ dunia: "antariksa", awal: { ...awal, antariksa: { fuel: 30 } }, akhir: { ...awal, antariksa: { fuel: 50 } }, benar: 2, n: 5, bossKalah: false });
ok(s.banner === "Mesin perlu dicek lagi" && s.tambahan === "Roketmu mendarat di Bulan!" && s.hadiah === "+20 liter bahan bakar", "hasil antariksa tiba di Bulan", s);
s = ringkasHasil({ dunia: "dino", awal: { ...awal, dino: { bones: 6, done: [] } }, akhir: { ...awal, dino: { bones: 1, done: ["T-Rex"] } }, benar: 3, n: 5, bossKalah: false });
ok(s.banner === "Ekspedisi sukses!" && s.hadiah === "+3 tulang fosil" && s.tambahan === "Kerangka T-Rex selesai dan dipajang di museum!", "hasil dino kerangka", s);

// Pesan
ok(pesanHasil("Raka", "mudah", 4, 5) === "Kerja bagus, Raka! Kamu sudah menguasai level mudah. Siap coba level sedang?", "pesan ≥80 mudah");
ok(pesanHasil("Raka", "sulit", 5, 5) === "Luar biasa, Raka! Level sulit pun sudah kamu kuasai.", "pesan ≥80 sulit");
ok(pesanHasil("Raka", "sedang", 3, 5).startsWith("Sedikit lagi, Raka. Ulangi level sedang"), "pesan 60-79");
ok(pesanHasil("Raka", "sedang", 2, 5).startsWith("Tidak apa-apa, Raka. Baca lagi penjelasan tadi"), "pesan <60");
ok(pesanHasil("Raka", "pilihan", 4, 5) === "Kerja bagus, Raka! Soal pilihan ini sudah kamu kuasai.", "pesan soal pilihan");

// Saran
const t = (topik: string, lv: StatTopik["lv"], waktu: string): StatTopik => ({ mapel: "Matematika", topik, lv, waktu });
const saran = hitungSaran([
  t("pecahan", { mudah: { best: 100, last: 100, tries: 1 } }, "2026-10-02"),
  t("desimal", { mudah: { best: 40, last: 40, tries: 1 } }, "2026-10-03"),
  t("lingkaran", { mudah: { best: 80, last: 80, tries: 1 }, sedang: { best: 100, last: 100, tries: 2 }, sulit: { best: 60, last: 50, tries: 1 } }, "2026-10-01"),
  t("sudut", { sulit: { best: 90, last: 90, tries: 1 } }, "2026-10-04"),
  t("bangun", { sedang: { best: 80, last: 40, tries: 2 } }, "2026-09-01"),
]);
ok(saran.map((x) => x.label).join(" | ") === "Latih lagi: desimal (mudah) | Siap naik: pecahan → sedang | Siap naik: lingkaran → sulit | Latih lagi: lingkaran (sulit) | Siap naik: bangun → sulit",
  "saran: urut terbaru, siap naik & latih lagi, sulit dikuasai tanpa chip, best≥80 tidak 'latih lagi'", saran.map((x) => x.label));
ok(hitungSaran(Array.from({ length: 10 }, (_, i) => t(`t${i}`, { mudah: { best: 10, last: 10, tries: 1 } }, `2026-10-${10 + i}`))).length === 6, "maksimal 6 chip");
ok(kunciTopik("Matematika", "  Pecahan   Senilai ") === "matematika|pecahan senilai", "kunci topik", kunciTopik("Matematika", "  Pecahan   Senilai "));
ok(tanpaAkhiranContoh("Pecahan (soal contoh)") === "Pecahan", "akhiran soal contoh dibuang");
ok(tanggalPendek("2026-10-24T03:00:00Z") === "24 Okt", "tanggal pendek", tanggalPendek("2026-10-24T03:00:00Z"));

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
