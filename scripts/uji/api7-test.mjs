// Uji tahap 7: cek jawaban, hadiah per jawaban, akhir sesi, riwayat, statistik topik, soal contoh.
// Butuh Firebase Emulator, server Claude tiruan, dan `next start -p 3100` (lihat docs/STATUS.md).
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const call = (path, token, init = {}) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const pemain = async (t, name, kelas, theme) => (await call('/api/pemain', t, { method: 'POST', body: JSON.stringify({ name, kelas, theme }) })).body.player;
const soal = (t, b) => call('/api/soal', t, { method: 'POST', body: JSON.stringify(b) });
const jawab = (t, sesiId, b) => call(`/api/sesi/${sesiId}/jawab`, t, { method: 'POST', body: JSON.stringify(b) });
const dok = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).json();
const daftar = async (path) => (await (await fetch(`${FS}/${path}?pageSize=300`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
// Server tiruan selalu menulis pilihan benar sebagai "Benar n".
const kunci = (q) => q.options.findIndex((o) => o.startsWith('Benar'));
const salahDari = (q) => (kunci(q) + 1) % 4;
const s = Date.now();

const A = await user(`t7a${s}@contoh.id`);
const B = await user(`t7b${s}@contoh.id`);

/* ---------- Dunia Blok: alur lengkap ---------- */
const raka = await pemain(A.token, 'Raka', 5, 'blok');
let r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
ok(r.status === 201 && r.body.sumber === 'ai' && r.body.topik === 'pecahan' && r.body.level === 'mudah' && r.body.mapel === 'Matematika', 'paket membawa metadata sesi', r.body && { ...r.body, soal: undefined });
const sesi1 = r.body;

let j = await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 0, pilihan: salahDari(sesi1.soal[0]) });
ok(j.status === 200 && j.body.benar === false && j.body.answer === kunci(sesi1.soal[0]) && j.body.explain === 'Karena benar 1.', 'jawaban salah: kunci & penjelasan baru dikirim setelah menjawab', j.body);
ok(j.body.hadiah === null && j.body.rewards.blok.kayu === 0 && j.body.akhir === null, 'salah: tanpa hadiah, sesi belum selesai');

j = await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 0, pilihan: kunci(sesi1.soal[0]) });
ok(j.status === 200 && j.body.benar === false && j.body.pilihan === salahDari(sesi1.soal[0]) && j.body.rewards.blok.kayu === 0, 'satu soal hanya bisa dijawab sekali (hasil pertama dikembalikan)');

j = await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 1, pilihan: kunci(sesi1.soal[1]) });
ok(j.body.benar && j.body.hadiah?.dunia === 'blok' && j.body.hadiah.material === 'kayu' && j.body.rewards.blok.kayu === 1, 'benar level mudah: +1 kayu langsung tersimpan', j.body.hadiah);
let p = (await call(`/api/pemain/${raka.id}`, A.token)).body.player;
ok(p.rewards.blok.kayu === 1, 'hadiah sudah di profil pemain sebelum sesi selesai');

// Ketukan beruntun di soal yang sama: hadiah hanya sekali (transaksi).
const paralel = await Promise.all([0, 1, 2].map(() => jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 2, pilihan: kunci(sesi1.soal[2]) })));
ok(paralel.every((x) => x.status === 200 && x.body.benar), '3 ketukan bersamaan semuanya dijawab', paralel.map((x) => x.status));
p = (await call(`/api/pemain/${raka.id}`, A.token)).body.player;
ok(p.rewards.blok.kayu === 2, 'ketukan bersamaan: kayu hanya +1', p.rewards.blok);

await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 3, pilihan: kunci(sesi1.soal[3]) });
j = await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 4, pilihan: kunci(sesi1.soal[4]) });
ok(j.body.akhir && j.body.akhir.benar === 4 && j.body.akhir.n === 5 && j.body.akhir.bossKalah === false, 'jawaban terakhir menutup sesi: 4/5', j.body.akhir);
ok(j.body.rewards.blok.kayu === 4, 'total 4 kayu');

const at = await dok(`families/${A.uid}/players/${raka.id}/attempts/${sesi1.sesiId}`);
const f = at.fields ?? {};
ok(f.correct?.integerValue === '4' && f.n?.integerValue === '5' && f.source?.stringValue === 'ai' && f.level?.stringValue === 'mudah' && f.subject?.stringValue === 'Matematika' && f.topic?.stringValue === 'pecahan', 'riwayat (attempts) tersimpan', f.correct);
const ans = f.answers?.arrayValue?.values?.map((v) => v.mapValue.fields) ?? [];
ok(ans.length === 5 && ans.every((a) => 'q' in a && 'options' in a && 'answer' in a && 'pilihan' in a), 'answers per soal: teks, pilihan, kunci, jawaban anak');
const sd = await dok(`families/${A.uid}/players/${raka.id}/sesi/${sesi1.sesiId}`);
ok(sd.fields.selesai.booleanValue === true && sd.fields.benar.integerValue === '4', 'dokumen sesi ditandai selesai');

let ts = await daftar(`families/${A.uid}/players/${raka.id}/topikStat`);
let lv = ts[0]?.fields?.lv?.mapValue?.fields?.mudah?.mapValue?.fields;
ok(ts.length === 1 && lv?.best.integerValue === '80' && lv?.last.integerValue === '80' && lv?.tries.integerValue === '1' && ts[0].fields.kunci.stringValue === 'matematika|pecahan', 'topic_stats: best 80, last 80, tries 1', lv);

j = await jawab(A.token, sesi1.sesiId, { pemainId: raka.id, nomor: 4, pilihan: 0 });
ok(j.body.akhir?.benar === 4 && j.body.rewards.blok.kayu === 4, 'mengulang jawaban terakhir tidak mencatat ulang');

// Sesi kedua topik sama, skor 40%
r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: '  Pecahan ', level: 'mudah', n: 5 });
const sesi2 = r.body;
for (let i = 0; i < 5; i++) await jawab(A.token, sesi2.sesiId, { pemainId: raka.id, nomor: i, pilihan: i < 2 ? kunci(sesi2.soal[i]) : salahDari(sesi2.soal[i]) });
ts = await daftar(`families/${A.uid}/players/${raka.id}/topikStat`);
lv = ts[0]?.fields?.lv?.mapValue?.fields?.mudah?.mapValue?.fields;
ok(ts.length === 1 && lv?.best.integerValue === '80' && lv?.last.integerValue === '40' && lv?.tries.integerValue === '2', 'topik sama (huruf besar/spasi beda): best tetap 80, last 40, tries 2', lv);

let rk = await call(`/api/pemain/${raka.id}/ringkasan`, A.token);
ok(rk.status === 200 && rk.body.riwayat.length === 2 && rk.body.riwayat[0].benar === 2 && rk.body.riwayat[1].benar === 4, 'ringkasan: riwayat terbaru dulu', rk.body.riwayat?.map((x) => x.benar));
ok(rk.body.topik.length === 1 && rk.body.topik[0].lv.mudah.best === 80 && rk.body.aiTersedia === true, 'ringkasan: statistik topik + aiTersedia');

/* ---------- Keamanan dan validasi ---------- */
r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
const sesi3 = r.body;
j = await jawab(B.token, sesi3.sesiId, { pemainId: raka.id, nomor: 0, pilihan: 0 });
ok(j.status === 404, 'keluarga lain tidak bisa menjawab sesi', j.status);
ok((await call(`/api/pemain/${raka.id}/ringkasan`, B.token)).status === 404, 'keluarga lain tidak bisa membaca riwayat');
ok((await jawab(A.token, sesi3.sesiId, { pemainId: raka.id, nomor: 7, pilihan: 0 })).status === 400, 'nomor di luar paket ditolak');
ok((await jawab(A.token, sesi3.sesiId, { pemainId: raka.id, nomor: 0, pilihan: 4 })).status === 400, 'pilihan di luar A-D ditolak');
ok((await jawab(A.token, sesi3.sesiId, { pemainId: raka.id, nomor: 0, pilihan: 0, answer: 0 })).status === 400, 'field asing ditolak');
ok((await jawab(A.token, 'tidakada', { pemainId: raka.id, nomor: 0, pilihan: 0 })).status === 404, 'sesi tidak ada: 404');
ok((await fetch(`${APP}/api/sesi/${sesi3.sesiId}/jawab`, { method: 'POST', body: '{}' })).status === 401, 'tanpa login: 401');

/* ---------- Arena Pahlawan: boss ---------- */
const nadia = await pemain(A.token, 'Nadia', 8, 'pahlawan');
r = await soal(A.token, { pemainId: nadia.id, mapel: 'IPA', topik: 'sel', level: 'sedang', n: 5 });
for (let i = 0; i < 5; i++) j = await jawab(A.token, r.body.sesiId, { pemainId: nadia.id, nomor: i, pilihan: i === 0 ? salahDari(r.body.soal[i]) : kunci(r.body.soal[i]) });
ok(j.body.akhir.bossKalah === true && j.body.rewards.pahlawan.xp === 4 * 20 + 15 && j.body.rewards.pahlawan.bosses === 1, 'pahlawan 4/5 sedang: 80 XP + bonus 15, boss +1', j.body.rewards.pahlawan);
r = await soal(A.token, { pemainId: nadia.id, mapel: 'IPA', topik: 'sel', level: 'sulit', n: 5 });
for (let i = 0; i < 5; i++) j = await jawab(A.token, r.body.sesiId, { pemainId: nadia.id, nomor: i, pilihan: i < 3 ? kunci(r.body.soal[i]) : salahDari(r.body.soal[i]) });
ok(j.body.akhir.bossKalah === false && j.body.rewards.pahlawan.xp === 95 + 90 && j.body.rewards.pahlawan.bosses === 1, 'pahlawan 3/5 sulit: boss bertahan, XP per jawaban tetap dihitung', j.body.rewards.pahlawan);

/* ---------- Lembah Dino: kerangka + sesi ditinggal ---------- */
const bima = await pemain(A.token, 'Bima', 11, 'dino');
r = await soal(A.token, { pemainId: bima.id, mapel: 'Fisika', topik: 'gaya', level: 'sulit', n: 5 });
for (let i = 0; i < 3; i++) j = await jawab(A.token, r.body.sesiId, { pemainId: bima.id, nomor: i, pilihan: kunci(r.body.soal[i]) });
ok(j.body.hadiah.kerangkaBaru.join() === 'T-Rex' && j.body.rewards.dino.bones === 1 && j.body.rewards.dino.done.join() === 'T-Rex', 'dino: 9 tulang → kerangka T-Rex + sisa 1', j.body.rewards.dino);
p = (await call(`/api/pemain/${bima.id}`, A.token)).body.player;
ok(p.rewards.dino.done.length === 1 && p.rewards.dino.bones === 1, 'sesi ditinggal di tengah: hadiah tetap tersimpan');
ok((await daftar(`families/${A.uid}/players/${bima.id}/attempts`)).length === 0, 'sesi ditinggal: tidak masuk riwayat');

/* ---------- Misi Antariksa: soal contoh ---------- */
const sari = await pemain(A.token, 'Sari', 8, 'antariksa');
r = await call('/api/soal/contoh', A.token, { method: 'POST', body: JSON.stringify({ pemainId: sari.id }) });
ok(r.status === 201 && r.body.sumber === 'demo' && r.body.topik === 'Bilangan bulat (soal contoh)' && r.body.level === 'mudah' && r.body.soal.length === 5, 'soal contoh SMP: Bilangan bulat', r.body && r.body.topik);
ok(r.body.soal.every((x) => Object.keys(x).sort().join() === 'options,q'), 'soal contoh juga tanpa kunci di browser');
const kunciSmp = [2, 3, 0, 1, 1];
for (let i = 0; i < 5; i++) j = await jawab(A.token, r.body.sesiId, { pemainId: sari.id, nomor: i, pilihan: kunciSmp[i] });
ok(j.body.akhir.benar === 5 && j.body.rewards.antariksa.fuel === 50, 'antariksa 5/5 mudah: +50 liter', j.body.rewards.antariksa);
rk = await call(`/api/pemain/${sari.id}/ringkasan`, A.token);
ok(rk.body.riwayat.length === 1 && rk.body.riwayat[0].sumber === 'demo' && rk.body.topik.length === 0, 'soal contoh masuk riwayat tapi tidak ke statistik topik');
const sdC = await call('/api/soal/contoh', A.token, { method: 'POST', body: JSON.stringify({ pemainId: (await pemain(A.token, 'Tia', 2, 'blok')).id }) });
ok(sdC.body.topik === 'Pecahan (soal contoh)' && sdC.body.mapel === 'Matematika', 'soal contoh SD: Pecahan');
ok((await call('/api/soal/contoh', B.token, { method: 'POST', body: JSON.stringify({ pemainId: sari.id }) })).status === 404, 'soal contoh: pemain keluarga lain ditolak');

/* ---------- Hapus pemain menghapus riwayat ---------- */
await call(`/api/pemain/${raka.id}`, A.token, { method: 'DELETE' });
ok((await daftar(`families/${A.uid}/players/${raka.id}/attempts`)).length === 0 && (await daftar(`families/${A.uid}/players/${raka.id}/topikStat`)).length === 0, 'hapus pemain: riwayat & statistik ikut terhapus');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
