// Uji /api/soal (tahap 6) terhadap Firebase Emulator dan server Claude tiruan.
import fs from 'node:fs';
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const LOG = process.argv[2];
const MODE = process.argv[3] ?? 'utama';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const call = (path, token, init = {}) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const pemain = async (t, name, kelas) => (await call('/api/pemain', t, { method: 'POST', body: JSON.stringify({ name, kelas, theme: 'blok' }) })).body.player;
const soal = (t, b) => call('/api/soal', t, { method: 'POST', body: JSON.stringify(b) });
const dok = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).json();
const daftar = async (path) => (await (await fetch(`${FS}/${path}?pageSize=300`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const jatah = async (uid) => { const d = await dok(`families/${uid}/pemakaian/${hari}`); return Number(d.fields?.total?.integerValue ?? 0); };
const permintaanTerakhir = () => { const baris = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(baris[baris.length - 1]); };
const s = Date.now();

if (MODE === 'tanpa-kunci') {
  const A = await user(`nk${s}@contoh.id`); const p = await pemain(A.token, 'Raka', 5);
  const r = await soal(A.token, { pemainId: p.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
  ok(r.status === 503 && r.body.error === 'ai_belum_siap', 'tanpa ANTHROPIC_API_KEY: ai_belum_siap', r.status);
  ok((await jatah(A.uid)) === 0, 'jatah dikembalikan saat AI belum siap');
} else if (MODE === 'batas') {
  const A = await user(`bt${s}@contoh.id`);
  const p1 = await pemain(A.token, 'Raka', 5); const p2 = await pemain(A.token, 'Nadia', 8);
  const kode = [];
  for (let i = 0; i < 4; i++) kode.push((await soal(A.token, { pemainId: p1.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 })).status);
  ok(kode.join(',') === '201,201,201,429', 'batas per anak (3): soal ke-4 ditolak', kode.join(','));
  const r4 = await soal(A.token, { pemainId: p1.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
  ok(r4.body.error === 'jatah_habis', 'kode jatah_habis');
  const k2 = [];
  for (let i = 0; i < 3; i++) k2.push((await soal(A.token, { pemainId: p2.id, mapel: 'IPA', topik: 'sel', level: 'mudah', n: 5 })).status);
  ok(k2.join(',') === '201,201,429', 'batas per keluarga (5): paket ke-6 keluarga ditolak', k2.join(','));
  const B = await user(`bt2${s}@contoh.id`); const p3 = await pemain(B.token, 'Bima', 11);
  const paralel = await Promise.all(Array.from({ length: 6 }, () => soal(B.token, { pemainId: p3.id, mapel: 'Fisika', topik: 'gaya', level: 'sulit', n: 5 })));
  const sukses = paralel.filter((r) => r.status === 201).length;
  ok(sukses === 3, '6 ketukan bersamaan: tepat 3 berhasil (transaksi)', sukses);
  ok((await jatah(B.uid)) === 3, 'hitungan jatah tetap 3');
} else if (MODE === 'haiku') {
  const A = await user(`hk${s}@contoh.id`); const p = await pemain(A.token, 'Raka', 5);
  const r = await soal(A.token, { pemainId: p.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
  const q = permintaanTerakhir();
  ok(r.status === 201 && q.body.model === 'claude-haiku-5-5', 'AI_MODEL_SOAL=claude-haiku-5-5 dipakai');
  ok(!('fallbacks' in q.body) && q.headers.beta === null, 'Haiku: tanpa fallbacks dan tanpa header beta');
} else {
  const A = await user(`ai${s}@contoh.id`); const B = await user(`ai2${s}@contoh.id`);
  const raka = await pemain(A.token, 'Raka', 5);

  let r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: '  pecahan   senilai ', level: 'sedang', n: 5 });
  ok(r.status === 201 && r.body.sesiId && r.body.soal.length === 5, 'paket 5 soal dibuat', r.status);
  ok(r.body.soal.every((x) => Object.keys(x).sort().join() === 'options,q' && x.options.length === 4), 'browser hanya menerima soal + pilihan (tanpa kunci & penjelasan)');
  const q = permintaanTerakhir();
  ok(q.body.model === 'claude-sonnet-5-5' && q.body.max_tokens === 16000, 'model claude-sonnet-5-5, max_tokens 16000');
  ok(q.body.output_config?.effort === 'medium' && q.body.output_config?.format?.type === 'json_schema', 'effort medium + structured outputs');
  ok(q.body.fallbacks === 'default' && String(q.headers.beta).includes('server-side-fallback-2026-07-01'), 'server-side fallback default + header beta');
  ok(!('thinking' in q.body) && !('temperature' in q.body), 'tanpa parameter thinking/temperature yang ditolak model');
  const pr = q.body.messages[0].content;
  ok(pr.includes('Kamu guru kelas 5 SD di Indonesia yang mengajar dengan Kurikulum Merdeka (Fase C).'), 'prompt: guru kelas 5 SD, Fase C');
  ok(pr.includes('Buat 5 soal pilihan ganda mata pelajaran Matematika tentang') && pr.includes('tingkat kesulitan sedang'), 'prompt: jumlah, mapel, level');
  ok(pr.includes('<<<\npecahan senilai\n>>>'), 'prompt: materi dirapikan dan dibungkus pembatas');
  ok(pr.includes('usia 10-11 tahun') && pr.includes('anak usia 10 tahun'), 'prompt: usia kelas+5');

  const sesi = await dok(`families/${A.uid}/players/${raka.id}/sesi/${r.body.sesiId}`);
  const tersimpan = sesi.fields.soal.arrayValue.values.map((v) => v.mapValue.fields);
  ok(tersimpan.every((x) => 'answer' in x && 'explain' in x), 'kunci & penjelasan tersimpan di server');
  ok(sesi.fields.sumber.stringValue === 'ai' && sesi.fields.topik.stringValue === 'pecahan senilai' && sesi.fields.n.integerValue === '5', 'metadata sesi');
  ok(tersimpan.every((x) => x.options.arrayValue.values[Number(x.answer.integerValue)].stringValue.startsWith('Benar')), 'kunci tetap menunjuk jawaban benar setelah diacak');
  const posisi = new Set();
  for (let i = 0; i < 4; i++) {
    const rr = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 10 });
    const d = await dok(`families/${A.uid}/players/${raka.id}/sesi/${rr.body.sesiId}`);
    d.fields.soal.arrayValue.values.forEach((v) => posisi.add(v.mapValue.fields.answer.integerValue));
  }
  ok(posisi.size >= 3, 'posisi kunci tersebar (AI selalu menaruh di A)', [...posisi].join(','));

  r = await soal(A.token, { pemainId: raka.id, mapel: 'IPA', topik: 'sel', level: 'mudah', n: 5 });
  ok(r.status === 400, 'mapel SMP (IPA) ditolak untuk kelas SD');
  r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: '   ', level: 'mudah', n: 5 });
  ok(r.status === 400 && r.body.message.startsWith('Tulis dulu materi'), 'materi kosong ditolak dengan pesan brief');
  r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'x'.repeat(121), level: 'mudah', n: 5 });
  ok(r.status === 400, 'materi 121 karakter ditolak');
  r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 7 });
  ok(r.status === 400, 'jumlah 7 ditolak');
  r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'pilihan', n: 5 });
  ok(r.status === 400, 'level tak dikenal ditolak');
  r = await soal(B.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
  ok(r.status === 404, 'keluarga lain tidak bisa memakai pemain A', r.status);

  const sebelum = await jatah(A.uid);
  const gagal = [['tolak senjata', 422, 'ditolak'], ['rusak', 502, 'json_rusak'], ['sedikit', 502, 'kurang_lengkap'], ['sibuk', 429, 'terlalu_cepat'], ['kuncisalah', 503, 'ai_belum_siap']];
  for (const [t, st, kode] of gagal) {
    r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: t, level: 'mudah', n: 5 });
    ok(r.status === st && r.body.error === kode, `AI ${t}: ${kode}`, `${r.status} ${r.body?.error}`);
  }
  ok((await jatah(A.uid)) === sebelum, 'semua kegagalan mengembalikan jatah', `${sebelum} → ${await jatah(A.uid)}`);
  r = await soal(A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'campur', level: 'mudah', n: 5 });
  ok(r.status === 201 && r.body.soal.length === 4, 'soal tidak valid dibuang, 4 yang valid dipakai', r.body?.soal?.length);

  const log = (await daftar(`families/${A.uid}/logAi`)).map((d) => d.fields);
  const hasil = log.map((l) => l.hasil.stringValue).sort();
  ok(log.length === 9, 'log biaya: 9 permintaan yang memakai token', log.length);
  ok(['ditolak', 'json_rusak', 'kurang_lengkap'].every((h) => hasil.includes(h)) && hasil.filter((h) => h === 'ok').length === 6, 'log mencatat hasil gagal dan berhasil');
  ok(log.every((l) => l.pemakaian.mapValue.fields.masuk.integerValue === '700' && l.model.stringValue === 'claude-sonnet-5-5'), 'log berisi model dan token');

  const bocor = JSON.stringify(log) + JSON.stringify(r.body);
  ok(!bocor.includes('sk-tiruan'), 'kunci API tidak pernah tersimpan atau dikirim balik');
}
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
