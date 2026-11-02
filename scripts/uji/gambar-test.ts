// Uji logika gambar soal dari foto (STATUS "BERIKUTNYA" no. 3): usulan kotak AI, geser & tarik sudut.
// Jalankan: npx tsx scripts/uji/gambar-test.ts
import { KOTAK_MIN, gambarDipakai, geserKotak, kotakDariAi, kotakTengah, rapikanKotak, tarikSudut } from "../../lib/gambarSoal";
import { soalPilihanSchema } from "../../lib/soalPilihan";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };
const dekat = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/* ---------- Usulan kotak dari AI (skala 0–1000, foto mulai 1) ---------- */
const k = kotakDariAi({ foto: 2, x1: 100, y1: 200, x2: 600, y2: 700 }, 3);
ok(k?.foto === 1 && dekat(k.x1, 0.1) && dekat(k.y1, 0.2) && dekat(k.x2, 0.6) && dekat(k.y2, 0.7), "kotak AI → pecahan, foto dari 0", k);
for (const [nama, raw] of [
  ["semua nol", { foto: 0, x1: 0, y1: 0, x2: 0, y2: 0 }],
  ["foto melebihi jumlah", { foto: 4, x1: 0, y1: 0, x2: 500, y2: 500 }],
  ["terbalik", { foto: 1, x1: 600, y1: 200, x2: 100, y2: 700 }],
  ["terlalu kecil", { foto: 1, x1: 100, y1: 100, x2: 120, y2: 500 }],
  ["di luar skala", { foto: 1, x1: 0, y1: 0, x2: 1200, y2: 500 }],
  ["bukan angka", { foto: 1, x1: "0", y1: 0, x2: 500, y2: 500 }],
  ["kosong", null],
] as const)
  ok(kotakDariAi(raw, 3) === null, `kotak AI tidak valid → null: ${nama}`);

/* ---------- Rapikan, geser, tarik ---------- */
const r = rapikanKotak({ foto: 0, x1: 0.9, y1: -0.2, x2: 0.3, y2: 1.4 });
ok(dekat(r.x1, 0.3) && dekat(r.x2, 0.9) && r.y1 === 0 && r.y2 === 1, "rapikan: sudut diurutkan & dibatasi 0–1", r);
const kecil = rapikanKotak({ foto: 0, x1: 0.99, y1: 0.5, x2: 0.99, y2: 0.5 });
ok(dekat(kecil.x2 - kecil.x1, KOTAK_MIN) && kecil.x2 <= 1 && dekat(kecil.y2 - kecil.y1, KOTAK_MIN), "rapikan: kotak minimal 5% tetap di dalam foto", kecil);

const t = kotakTengah(0);
let g = geserKotak(t, 0.1, -0.1);
ok(dekat(g.x1, t.x1 + 0.1) && dekat(g.y1, t.y1 - 0.1) && dekat(g.x2 - g.x1, t.x2 - t.x1), "geser: ukuran tetap");
g = geserKotak(t, 5, 5);
ok(dekat(g.x2, 1) && dekat(g.y2, 1) && dekat(g.x2 - g.x1, t.x2 - t.x1), "geser: tidak keluar foto (kanan bawah)", g);
g = geserKotak(t, -5, -5);
ok(g.x1 === 0 && g.y1 === 0, "geser: tidak keluar foto (kiri atas)");

let s = tarikSudut(t, "kanan-bawah", 0.95, 0.9);
ok(s.x1 === t.x1 && s.y1 === t.y1 && dekat(s.x2, 0.95) && dekat(s.y2, 0.9), "tarik kanan-bawah: sudut seberang tetap");
s = tarikSudut(t, "kiri-atas", 0.05, 0.1);
ok(dekat(s.x1, 0.05) && dekat(s.y1, 0.1) && s.x2 === t.x2 && s.y2 === t.y2, "tarik kiri-atas");
s = tarikSudut(t, "kiri-atas", 0.99, 0.99);
ok(dekat(s.x2 - s.x1, KOTAK_MIN) && dekat(s.y2 - s.y1, KOTAK_MIN), "tarik melewati sudut seberang: berhenti di ukuran minimal", s);
s = tarikSudut(t, "kanan-atas", 1.5, -0.5);
ok(s.x2 === 1 && s.y1 === 0 && s.x1 === t.x1 && s.y2 === t.y2, "tarik kanan-atas: dibatasi tepi foto");

/* ---------- Data ---------- */
ok(gambarDipakai([{ gambarId: "a" }, {}, { gambarId: "b" }, { gambarId: "a" }]).join() === "a,b", "gambar dipakai: tanpa duplikat");
const dasar = { q: "Perhatikan gambar.", options: ["1", "2"], answer: 0, explain: "", keyGuessed: false, optionsAdded: false };
ok(soalPilihanSchema.safeParse({ ...dasar, gambarId: "AbCdEf1234567890" }).success, "skema: gambarId valid");
ok(!soalPilihanSchema.safeParse({ ...dasar, gambarId: "../rahasia" }).success && !soalPilihanSchema.safeParse({ ...dasar, gambarId: "x" }).success, "skema: gambarId aneh ditolak");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
