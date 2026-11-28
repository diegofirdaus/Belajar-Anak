// Uji soal 5 pilihan (A–E) dan laporan soal yang dilewati (baca foto & rapikan), plus anak menjawab pilihan E.
// Butuh emulator, mock-claude (log di argv[2]), next start.
import fs from 'node:fs';
const APP = 'http://localhost:3100';
const LOG = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken };
};
const post = (p, t, b, s) => fetch(APP + p, { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json', authorization: `Bearer ${t}`, ...(s ? { 'x-admin-sesi': s } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };
const prompt = (b) => { const c = b.messages[0].content; return typeof c === 'string' ? c : c.filter((x) => x.type === 'text').map((x) => x.text).join('\n'); };

const A = await user(`lima${Date.now()}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const anak = (await post('/api/pemain', A.token, { name: 'Bima', kelas: 8, theme: 'blok' })).body.player;

let r = await post('/api/admin/baca-foto', A.token, { kelas: 8, mapel: 'Pendidikan Jasmani (PJOK)', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1900) }] }, sesi);
ok(r.status === 200 && r.body.soal.length === 2 && r.body.soal.every((q) => q.options.length === 5), 'baca foto: soal 5 pilihan ikut masuk', r.body?.soal?.map((q) => q.options.length));
ok(r.body.dilewati?.length === 1 && r.body.dilewati[0] === 'Soal yang pilihannya tidak terbaca', 'soal yang tidak terbaca utuh dilaporkan', r.body.dilewati);
ok(r.body.teks.includes('\nE. Juggling') && r.body.teks.includes('E. 8'), 'teks kolom Soal memuat pilihan E');
ok(prompt(terakhir()).includes('5 pilihan (A–E) ditulis lengkap') && prompt(terakhir()).includes('Ambil SEMUA soal'), 'prompt baca foto: pertahankan A–E, ambil semua soal');

r = await post('/api/admin/rapikan', A.token, { kelas: 8, mapel: 'Pendidikan Jasmani (PJOK)', teks: '1. limapilihan\nA. a\nB. b\nC. c\nD. d\nE. e\nKunci: E' }, sesi);
ok(r.status === 200 && r.body.soal.length === 2 && r.body.dilewati.length === 1 && prompt(terakhir()).includes('A=0 … E=4'), 'rapikan: 5 pilihan + laporan soal dilewati');

r = await post('/api/admin/soal-pilihan', A.token, { title: 'Bola', kelas: 8, subject: 'Pendidikan Jasmani (PJOK)', sourceText: 'x', questions: r.body.soal, acakPilihan: false }, sesi);
ok(r.status === 201 && r.body.paket.questions[1].answer === 4, 'paket dengan kunci E tersimpan');
const s = (await post('/api/soal/pilihan', A.token, { pemainId: anak.id, setId: r.body.paket.id })).body;
let j = await post(`/api/sesi/${s.sesiId}/jawab`, A.token, { pemainId: anak.id, nomor: 1, pilihan: 4 });
ok(j.status === 200 && j.body.benar === true && j.body.answer === 4, 'anak menjawab E: benar', j.body);
j = await post(`/api/sesi/${s.sesiId}/jawab`, A.token, { pemainId: anak.id, nomor: 0, pilihan: 5 });
ok(j.status === 400, 'pilihan di luar A–E ditolak');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
