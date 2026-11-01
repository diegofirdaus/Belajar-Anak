// Uji ringkasan dashboard progres orang tua. Jalankan: npx tsx scripts/uji/progres-test.ts
import { emptyRewards } from "../../lib/rewards";
import type { Riwayat, StatTopik } from "../../lib/latihan";
import { kapan, ringkas, ringkasHadiah } from "../../lib/progres";

let gagal = 0;
const ok = (c: boolean, n: string, x: unknown = "") => { console.log(`${c ? "LULUS" : "GAGAL"}  ${n}${x !== "" ? "  " + JSON.stringify(x) : ""}`); if (!c) gagal++; };
const kini = new Date("2026-11-10T05:00:00Z");
const r = (mapel: string, n: number, benar: number, waktu: string): Riwayat => ({ id: waktu, mapel, topik: "t", level: "mudah", sumber: "ai", n, benar, waktu });
const riwayat = [
  r("Matematika", 5, 4, "2026-11-09T10:00:00Z"),
  r("Matematika", 10, 6, "2026-11-05T10:00:00Z"),
  r("IPAS", 5, 2, "2026-11-01T10:00:00Z"),
];
const t = (topik: string, lv: StatTopik["lv"]): StatTopik => ({ mapel: "Matematika", topik, lv, waktu: "2026-11-09T10:00:00Z" });
const s = ringkas(riwayat, [t("pecahan", { mudah: { best: 100, last: 100, tries: 1 } }), t("desimal", { sedang: { best: 40, last: 40, tries: 1 } })], kini);
ok(s.latihan === 3 && s.latihanPekanIni === 2, "latihan total & 7 hari terakhir", s);
ok(s.soal === 20 && s.benar === 12 && s.pct === 60, "soal, benar, persen");
ok(s.terakhir === "2026-11-09T10:00:00Z", "latihan terakhir");
ok(s.perMapel.map((m) => `${m.mapel}:${m.latihan}:${m.pct}`).join(",") === "Matematika:2:67,IPAS:1:40", "per mapel, urut jumlah latihan", s.perMapel);
ok(s.perluDibantu.map((x) => x.topik).join() === "desimal" && s.siapNaik.map((x) => `${x.topik}>${x.level}`).join() === "pecahan>sedang", "perlu dibantu & siap naik (tanpa batas 6)");
const kosong = ringkas([], [], kini);
ok(kosong.latihan === 0 && kosong.pct === 0 && kosong.terakhir === null && kosong.perMapel.length === 0, "anak belum latihan");
ok(ringkas([], Array.from({ length: 9 }, (_, i) => t(`x${i}`, { mudah: { best: 10, last: 10, tries: 1 } })), kini).perluDibantu.length === 9, "topik perlu dibantu tidak dibatasi 6");

const w = emptyRewards();
ok(ringkasHadiah("blok", { ...w, blok: { kayu: 20, batu: 11, permata: 0 } }) === "Pondok Kayu · 31 blok", "hadiah blok");
ok(ringkasHadiah("pahlawan", { ...w, pahlawan: { xp: 230, bosses: 4 } }) === "Rank Ksatria · 230 XP · 4 boss", "hadiah pahlawan");
ok(ringkasHadiah("antariksa", { ...w, antariksa: { fuel: 300 } }) === "Di Jupiter · 300 liter", "hadiah antariksa");
ok(ringkasHadiah("dino", { ...w, dino: { bones: 5, done: ["T-Rex", "Triceratops"] } }) === "2 kerangka · 5/8 tulang", "hadiah dino");

ok(kapan("2026-11-10T01:00:00Z", kini) === "hari ini", "kapan: hari ini");
ok(kapan("2026-11-09T01:00:00Z", kini) === "kemarin", "kapan: kemarin");
ok(kapan("2026-11-06T01:00:00Z", kini) === "4 hari lalu", "kapan: 4 hari lalu");
ok(kapan("2026-10-24T03:00:00Z", kini) === "24 Okt", "kapan: tanggal kalau > seminggu", kapan("2026-10-24T03:00:00Z", kini));
ok(kapan("2026-11-09T18:00:00Z", kini) === "hari ini", "kapan: memakai tanggal WIB (01.00 WIB 10 Nov = hari ini)");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
