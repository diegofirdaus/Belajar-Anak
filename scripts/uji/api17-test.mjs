// Uji "Buat soal dari bacaan" (salin bacaan + soal dari bacaan, sesi anak dengan bacaan, soal mirip dari bacaan)
// dan mapel Pendidikan Agama Islam / Islamic Studies (aturan huruf Arab, ayat, hadits). Butuh emulator, mock, next start.
import fs from 'node:fs';
const APP = 'http://localhost:3100';
const LOG = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const kirim = (method, path, token, body, sesi) => fetch(APP + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (path, token, body, sesi) => kirim('POST', path, token, body, sesi);
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };
const prompt = (b) => { const c = b.messages[0].content; return typeof c === 'string' ? c : c.filter((x) => x.type === 'text').map((x) => x.text).join('\n'); };
const pdf = () => Buffer.from(`%PDF-1.4\n% bacaan\n${'x'.repeat(300)}\n%%EOF`).toString('base64');
const fotoBesar = { media_type: 'image/jpeg', data: Buffer.alloc(3000, 7).toString('base64') };
const s = Date.now();

const A = await user(`bc${s}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
const BACAAN = 'Fotosintesis\n\nTumbuhan hijau membuat makanannya sendiri melalui fotosintesis. Proses ini memerlukan cahaya matahari, air, dan karbon dioksida.\n\nHasil fotosintesis adalah gula dan oksigen.';

// ---------- Salin bacaan ----------
ok((await post('/api/admin/salin-bacaan', A.token, { kelas: 5, mapel: 'IPAS', pdf: { data: pdf() } })).status === 403, 'salin bacaan: tanpa sesi admin ditolak');
let r = await post('/api/admin/salin-bacaan', A.token, { kelas: 5, mapel: 'IPAS', pdf: { data: pdf() } }, sesi);
let b = terakhir();
ok(r.status === 200 && r.body.teks.includes('Fotosintesis') && r.body.teks.includes('(pdf)'), 'salin bacaan dari PDF', r.body);
ok(b.model === 'claude-sonnet-5-5' && b.messages[0].content[0].type === 'document' && prompt(b).includes('Huruf Arab') && prompt(b).includes('jangan ikut disalin'), 'salin PDF: blok dokumen, aturan huruf Arab, tanpa soal latihan');
r = await post('/api/admin/salin-bacaan', A.token, { kelas: 5, mapel: 'IPAS', gambar: [fotoBesar, fotoBesar] }, sesi);
ok(r.status === 200 && r.body.teks.includes('(2 foto)') && prompt(terakhir()).includes('2 foto di atas'), 'salin bacaan dari 2 foto');
r = await post('/api/admin/salin-bacaan', A.token, { kelas: 5, mapel: 'IPAS', gambar: [{ media_type: 'image/jpeg', data: Buffer.alloc(200, 1).toString('base64') }] }, sesi);
ok(r.status === 502 && r.body.error === 'kurang_lengkap', 'foto tanpa bacaan: kurang_lengkap', r.body);

// ---------- Soal dari bacaan ----------
const soalBacaan = (x) => post('/api/admin/soal-bacaan', A.token, { kelas: 5, mapel: 'IPAS', teks: BACAAN, n: 10, level: 'sedang', esai: 2, ...x }, sesi);
r = await soalBacaan({});
b = terakhir();
ok(r.status === 200 && r.body.soal.length === 10 && r.body.soal.filter((q) => q.jenis === 'esai').length === 2, '10 soal dari bacaan, 2 esai', r.body?.soal?.length);
ok(r.body.soal.every((q) => q.keyGuessed === false && q.optionsAdded === false), 'tanda AI per soal dimatikan (catatan umum di editor)');
ok(prompt(b).includes('<<<\n' + BACAAN) && prompt(b).includes('8 soal pilihan ganda dan 2 soal esai') && prompt(b).includes('HARUS didukung isi bacaan') && b.output_config.effort === 'medium', 'prompt: bacaan, jumlah esai, jawaban dari bacaan');
r = await soalBacaan({ level: 'sulit', n: 5, esai: 0 });
b = terakhir();
ok(r.status === 200 && r.body.soal.length === 5 && b.output_config.effort === 'high' && prompt(b).includes('semuanya pilihan ganda'), 'level sulit: effort high, tanpa esai');
ok((await soalBacaan({ teks: 'terlalu pendek' })).status === 400, 'bacaan terlalu pendek ditolak');
ok((await soalBacaan({ n: 7 })).status === 400 && (await soalBacaan({ n: 5, esai: 5 })).status === 400, 'jumlah soal/esai tidak sah ditolak');
r = await soalBacaan({ teks: BACAAN + ' rusak' });
ok(r.status === 502, 'balasan rusak: gagal dengan pesan');

// ---------- Simpan paket bacaan, anak mengerjakan ----------
const soal = (await soalBacaan({ n: 5, esai: 1 })).body.soal;
ok((await post('/api/admin/soal-pilihan', A.token, { title: 'Fotosintesis', kelas: 5, subject: 'IPAS', sourceText: '  ', questions: soal, acakPilihan: true, dariBacaan: true }, sesi)).status === 400, 'paket bacaan tanpa bacaan ditolak');
r = await post('/api/admin/soal-pilihan', A.token, { title: 'Fotosintesis', kelas: 5, subject: 'IPAS', sourceText: BACAAN, questions: soal, acakPilihan: true, dariBacaan: true }, sesi);
ok(r.status === 201 && r.body.paket.dariBacaan === true, 'paket dari bacaan tersimpan', r.status);
const setId = r.body.paket.id;
const daftar = await kirim('GET', '/api/admin/soal-pilihan', A.token, null, sesi);
ok(daftar.body.paket.find((p) => p.id === setId)?.dariBacaan === true, 'daftar admin: dariBacaan terbaca lagi');
const biasa = await post('/api/admin/soal-pilihan', A.token, { title: 'Biasa', kelas: 5, subject: 'IPAS', sourceText: '1. a', questions: [soal[0]] }, sesi);
ok(biasa.status === 201 && biasa.body.paket.dariBacaan === false, 'paket biasa: dariBacaan false (bawaan)');

r = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId });
ok(r.status === 201 && r.body.bacaan === BACAAN && r.body.soal.length === 5, 'kerjakan: bacaan ikut dikirim ke anak');
const kb = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId: biasa.body.paket.id });
ok(kb.status === 201 && kb.body.bacaan === undefined, 'paket biasa: tanpa bacaan');
r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId });
b = terakhir();
ok(r.status === 201 && r.body.bacaan === BACAAN && r.body.soal.length === 5 && prompt(b).includes('<<<\n' + BACAAN) && prompt(b).includes('semuanya pilihan ganda') && !prompt(b).includes('"keyGuessed"'), 'soal mirip dari paket bacaan: soal baru dari bacaan yang sama');
const mb = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId: biasa.body.paket.id });
ok(mb.status === 201 && !prompt(terakhir()).includes('berdasarkan bacaan'), 'soal mirip paket biasa: tetap dari contoh soal');

// ---------- Pendidikan Agama Islam / Islamic Studies ----------
const sma = (await post('/api/pemain', A.token, { name: 'Nadia', kelas: 11, theme: 'dino' })).body.player;
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Pendidikan Agama Islam', topik: 'wudu', level: 'mudah', n: 5 });
b = terakhir();
ok(r.status === 201 && prompt(b).includes('Khusus Pendidikan Agama Islam') && prompt(b).includes("JANGAN menulis teks Arab ayat Al-Qur'an atau hadits dari ingatan.") && prompt(b).includes('Jangan mengarang hadits') && prompt(b).includes('Soal dalam Bahasa Indonesia'), 'PAI: aturan ayat/hadits, bahasa Indonesia');
r = await post('/api/soal', A.token, { pemainId: sma.id, mapel: 'Islamic Studies', topik: 'pillars of Islam', level: 'sedang', n: 5 });
b = terakhir();
ok(r.status === 201 && prompt(b).includes('bahasa Inggris sederhana') && prompt(b).includes('- Bahasa Inggris sederhana yang jelas'), 'Islamic Studies (SMA): soal bahasa Inggris');
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Islamic Studies', topik: '', level: 'olimpiade', n: 10 });
ok(r.status === 201 && r.body.level === 'olimpiade' && prompt(terakhir()).includes('Khusus Islamic Studies'), 'Islamic Studies: level tertinggi = Soal Tantangan, aturan ikut');
r = await post('/api/admin/salin-bacaan', A.token, { kelas: 5, mapel: 'Islamic Studies', gambar: [fotoBesar] }, sesi);
ok(r.status === 200 && r.body.teks.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'salin bacaan berhuruf Arab: harakat utuh', r.body?.teks);
r = await post('/api/admin/soal-bacaan', A.token, { kelas: 5, mapel: 'Pendidikan Agama Islam', teks: 'Doa sebelum makan: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ. ' + BACAAN, n: 5, level: 'mudah', esai: 0 }, sesi);
b = terakhir();
ok(r.status === 200 && prompt(b).includes('بِسْمِ اللَّهِ') && prompt(b).includes('kecuali menyalin persis yang ada di bacaan'), 'soal bacaan PAI: kutipan Arab hanya dari bacaan');
const pk = await post('/api/admin/soal-pilihan', A.token, { title: 'Doa', kelas: 5, subject: 'Pendidikan Agama Islam', sourceText: '1. Arti بِسْمِ اللَّهِ adalah', questions: [{ q: 'Arti بِسْمِ اللَّهِ adalah ...', options: ['Dengan nama Allah', 'Segala puji', 'Allah Maha Besar', 'Tiada Tuhan'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false }] }, sesi);
ok(pk.status === 201, 'paket PAI dengan huruf Arab tersimpan');
r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId: pk.body.paket.id });
ok(r.status === 201 && prompt(terakhir()).includes('kecuali menyalin persis yang ada di contoh soal orang tua'), 'soal mirip PAI: kutipan Arab hanya dari contoh');
ok((await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Pendidikan Agama Islam', topik: 'shalat', level: 'sulit', n: 5 })).status === 201, 'PAI tersedia untuk SD');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
