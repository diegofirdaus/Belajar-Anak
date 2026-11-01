// Uji ringkasan dashboard progres orang tua. Jalankan: npx tsx scripts/uji/progres-test.ts
import { emptyRewards } from "../../lib/rewards";
import type { Riwayat, StatTopik } from "../../lib/latihan";
import { aktivitas, bandingBulan, bisaDibantu, daftarBulan, kapan, mapelTerurut, namaBulan, ringkas, ringkasHadiah, statusAnak, trenMapel } from "../../lib/progres";

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

/* ---------- Dashboard v2 ---------- */
// kini = Selasa 10 Nov 2026, 12.00 WIB
const K = new Date("2026-11-10T05:00:00Z");
const hariLalu = (h: number, jam = 3) => new Date(K.getTime() - h * 86_400_000 + (jam - 5) * 3_600_000).toISOString();
let no = 0;
const L = (mapel: string, h: number, n: number, benar: number, level = "mudah", sumber: Riwayat["sumber"] = "ai"): Riwayat => ({ id: String(no++), mapel, topik: "t", level, sumber, n, benar, waktu: hariLalu(h) });

ok(statusAnak([], K).judul === "belum pernah latihan" && statusAnak([], K).warna === "netral", "status: belum pernah latihan");
let st = statusAnak([L("Matematika", 0, 5, 4), L("IPAS", 2, 5, 3), L("Matematika", 4, 5, 3)], K);
ok(st.warna === "hijau" && st.judul === "rajin dalam 7 hari terakhir" && st.detail === "3 latihan · 2 mata pelajaran", "status hijau: 3 hari aktif", st);
st = statusAnak([L("Matematika", 0, 5, 4), L("Matematika", 0, 5, 4), L("IPAS", 1, 5, 3)], K);
ok(st.warna === "netral" && st.judul === "latihan 2 hari dalam 7 hari terakhir", "status netral: 2 hari aktif", st.judul);
st = statusAnak([L("Matematika", 5, 5, 3), L("IPAS", 9, 5, 5)], K);
ok(st.warna === "oranye" && st.judul === "belum latihan 5 hari" && st.detail === "Terakhir Kamis · Matematika 3/5", "status oranye: 5 hari tanpa latihan", st);
ok(statusAnak([L("Matematika", 6, 5, 3)], K).judul === "belum latihan 6 hari" && statusAnak([L("Matematika", 2, 5, 3)], K).warna === "netral", "batas 3 hari");
// Sorotan: Matematika 7 hari terakhir 8/10=80%, 7 hari sebelumnya 7/10=70% → naik 10; IPAS hanya 1 latihan → tidak dihitung
st = statusAnak([L("Matematika", 0, 5, 4), L("Matematika", 3, 5, 4), L("Matematika", 8, 5, 3), L("Matematika", 10, 5, 4), L("IPAS", 1, 5, 0), L("IPAS", 9, 5, 5)], K);
ok(st.sorotan?.naik === true && st.sorotan.teks === "Matematika naik 10 poin dari 7 hari sebelumnya", "sorotan naik per mapel", st.sorotan);
st = statusAnak([L("IPAS", 0, 5, 2), L("IPAS", 1, 5, 2), L("IPAS", 8, 5, 4), L("IPAS", 9, 5, 4)], K);
ok(st.sorotan?.naik === false && st.sorotan.teks === "IPAS turun 40 poin dari 7 hari sebelumnya", "sorotan turun", st.sorotan);
ok(statusAnak([L("IPAS", 0, 5, 4), L("IPAS", 8, 5, 4), L("IPAS", 9, 5, 3)], K).sorotan === null, "sorotan butuh ≥ 2 latihan di kedua periode");
ok(statusAnak([L("IPAS", 0, 10, 8), L("IPAS", 1, 15, 13), L("IPAS", 8, 10, 8), L("IPAS", 9, 10, 8)], K).sorotan === null, "selisih < 5 poin (84 vs 80) tidak disorot");

const ak = aktivitas([L("Matematika", 0, 5, 4), L("IPAS", 0, 5, 4), L("Matematika", 13, 5, 4), L("Matematika", 20, 5, 4)], K);
ok(ak.daftar.length === 14 && ak.daftar[13].jumlah === 2 && ak.daftar[0].jumlah === 1 && ak.hariAktif === 2 && ak.maks === 2, "aktivitas 14 hari", ak.daftar.map((d) => d.jumlah).join(""));
ok(ak.daftar[13].label === "S" && ak.daftar[13].tanggal === "2026-11-10" && ak.daftar[12].label === "S" && ak.daftar[11].label === "M", "label hari (Selasa, Senin, Minggu)");
ok(aktivitas([L("A", 0, 5, 4, "mudah")], new Date("2026-11-09T18:00:00Z")).daftar[13].jumlah === 1, "aktivitas memakai tanggal WIB");

const rt = [L("Matematika", 30, 10, 6), L("Matematika", 22, 10, 7), L("Matematika", 15, 10, 7, "sedang"), L("Matematika", 1, 10, 8, "sedang"), L("Matematika", 0, 5, 5, "pilihan", "set"), L("IPAS", 1, 5, 1)];
const tr = trenMapel(rt, "Matematika", K);
ok(tr.length === 5 && tr.map((t) => t.pct ?? "-").join(",") === "60,70,70,-,87", "tren per 7 hari, mulai dari periode berisi", tr.map((t) => t.pct));
ok(tr.map((t) => t.level ?? "-").join(",") === "mudah,mudah,sedang,-,sedang", "level tertinggi soal AI per periode (soal pilihan diabaikan)", tr.map((t) => t.level));
ok(tr[4].label === "Ini" && tr[0].label === "7 Okt" && tr[4].soal === 15, "label tanggal mulai periode", tr.map((t) => t.label));
ok(trenMapel(rt, "Fisika", K).length === 0, "mapel tanpa latihan: kosong");
ok(mapelTerurut(rt).join() === "Matematika,IPAS", "mapel terurut dari paling sering");

const rb = [L("Matematika", 15, 10, 7), L("IPAS", 20, 5, 4), L("Matematika", 30, 10, 5, "pilihan", "set"), L("Matematika", 1, 10, 9), L("Matematika", 2, 10, 7), L("B. Indonesia", 3, 5, 4)];
ok(daftarBulan(rb, K).join() === "2026-11,2026-10" && namaBulan("2026-10") === "Oktober 2026", "daftar bulan & nama", daftarBulan(rb, K));
const bb = bandingBulan(rb, "2026-10", "2026-11");
ok(bb.baris.map((x) => `${x.label}:${x.a}>${x.b}`).join("|") === "Latihan:3>3|Hari aktif:3>3|Soal dijawab:25>25|Soal pilihan:1>0", "perbandingan bulan: latihan, hari aktif, soal, soal pilihan", bb.baris);
ok(bb.perMapel.map((x) => `${x.mapel}:${x.a ?? "-"}>${x.b ?? "-"}`).join("|") === "Matematika:60>80|B. Indonesia:->80|IPAS:80>-", "rata-rata benar per mapel (tidak digabung)", bb.perMapel);

const tp: StatTopik[] = [
  { mapel: "IPAS", topik: "cahaya", lv: { mudah: { best: 40, last: 40, tries: 2 } }, waktu: "2026-11-09T00:00:00Z" },
  { mapel: "IPAS", topik: "suara", lv: { mudah: { best: 50, last: 50, tries: 1 } }, waktu: "2026-11-08T00:00:00Z" },
  { mapel: "IPAS", topik: "panas", lv: { mudah: { best: 30, last: 30, tries: 1 } }, waktu: "2026-11-07T00:00:00Z" },
  { mapel: "Matematika", topik: "pecahan", lv: { mudah: { best: 100, last: 100, tries: 1 } }, waktu: "2026-11-06T00:00:00Z" },
];
const bt = bisaDibantu("Raka", [L("IPAS", 1, 5, 2), L("B. Indonesia", 25, 5, 4)], tp, K);
ok(bt.length === 3 && bt.map((x) => x.jenis).join() === "lemah,lemah,lama", "bantuan: 2 lemah + 1 lama tidak dilatih (maks 3)", bt.map((x) => x.jenis));
ok(bt[0].judul === "IPAS: cahaya" && bt[0].alasan === "Skor terakhir 40% di level mudah · 2 kali dicoba" && bt[0].saran === "Ajak Raka membaca ulang materinya, lalu latihan lagi di level mudah.", "teks bantuan topik lemah", bt[0]);
ok(bt[2].judul === "B. Indonesia" && bt[2].alasan === "Belum dilatih 3 minggu", "teks mapel lama tidak dilatih", bt[2]);
const bt2 = bisaDibantu("Raka", [L("Matematika", 1, 5, 5)], [tp[3]], K);
ok(bt2.length === 1 && bt2[0].jenis === "naik" && bt2[0].alasan === "100% di level mudah · siap naik" && bt2[0].saran === "Dorong Raka mencoba level sedang.", "bantuan: siap naik level", bt2[0]);
ok(bisaDibantu("Raka", [], [], K).length === 0, "tanpa data: tidak ada saran");

console.log(gagal ? `\n${gagal} GAGAL` : "\nSemua lulus");
process.exit(gagal ? 1 : 0);
