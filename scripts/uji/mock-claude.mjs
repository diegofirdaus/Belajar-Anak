// Server Claude API tiruan untuk menguji /api/soal tanpa kunci asli.
// Perilaku dipilih dari kata kunci di materi: tolak, rusak, sedikit, campur, sibuk, kunci, lambat; selain itu normal.
import http from 'node:http';
import fs from 'node:fs';
const LOG = process.argv[2];
let urutan = 0;

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const b = JSON.parse(body || '{}');
    const isi = b.messages?.[0]?.content ?? '';
    // Konten bisa berupa teks atau daftar blok (foto + teks). Foto tidak dicatat utuh di log.
    const prompt = typeof isi === 'string' ? isi : isi.filter((x) => x.type === 'text').map((x) => x.text).join('\n');
    const foto = typeof isi === 'string' ? [] : isi.filter((x) => x.type === 'image');
    const dicatat = typeof isi === 'string' ? b : { ...b, messages: [{ ...b.messages[0], content: isi.map((x) => (x.type === 'image' ? { type: 'image', media_type: x.source.media_type, panjang: x.source.data.length } : x)) }] };
    fs.appendFileSync(LOG, JSON.stringify({ path: req.url, headers: { beta: req.headers['anthropic-beta'] ?? null, key: req.headers['x-api-key'] ? 'ada' : null }, body: dicatat }) + '\n');
    const n = Number(/Buat (\d+) soal/.exec(prompt)?.[1] ?? 5);
    const kirim = (status, data) => { res.writeHead(status, { 'content-type': 'application/json', 'request-id': 'req_tiruan' }); res.end(JSON.stringify(data)); };
    const pesan = (teks, stop = 'end_turn') => kirim(200, {
      id: 'msg_' + ++urutan, type: 'message', role: 'assistant', model: b.model,
      content: [{ type: 'text', text: teks }], stop_reason: stop, stop_sequence: null,
      stop_details: stop === 'refusal' ? { type: 'refusal', category: 'general_harms', explanation: 'tiruan' } : null,
      usage: { input_tokens: 700, output_tokens: 1200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    });
    const soal = (i) => ({ q: `Soal nomor ${i + 1}?`, options: [`Benar ${i + 1}`, `Salah A${i}`, `Salah B${i}`, `Salah C${i}`], answer: 0, explain: `Karena benar ${i + 1}.` });

    // Pemeriksaan esai: poin "ada" kalau salah satu kata (≥ 5 huruf) poin muncul di jawaban; "keliru" → fakta keliru;
    // "rusak" → JSON rusak; "PALSU" → AI mengaku semua poin ada dengan kutipan karangan (harus ditolak kode).
    if (prompt.includes('Kamu memeriksa jawaban esai')) {
      const daftar = prompt.split('Poin yang dinilai:\n')[1].split('\nTugas:')[0].split('\n').map((x) => x.replace(/^\d+\. /, ''));
      const jawaban = prompt.split('<<<\n')[1].split('\n>>>')[0];
      const kecil = jawaban.toLowerCase();
      if (jawaban.includes('rusak')) return pesan('ini bukan JSON {');
      if (jawaban.includes('PALSU')) return pesan(JSON.stringify({ poin: daftar.map((_, i) => ({ nomor: i + 1, ada: true, kutipan: 'tumbuhan membuat makanan dengan cahaya matahari' })), faktaKeliru: false, keliru: '' }));
      const poin = daftar.map((d, i) => {
        const kata = d.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 5).find((w) => kecil.includes(w)) ?? '@@';
        const k = kecil.indexOf(kata);
        return { nomor: i + 1, ada: k >= 0, kutipan: k >= 0 ? jawaban.slice(k, k + kata.length) : '' };
      });
      const keliru = kecil.includes('keliru');
      return pesan(JSON.stringify({ poin, faktaKeliru: keliru, keliru: keliru ? 'Matahari tidak mengelilingi bumi.' : '' }));
    }
    if (prompt.includes('lambat')) return setTimeout(() => pesan(JSON.stringify({ soal: Array.from({ length: n }, (_, i) => soal(i)) })), 4000);
    if (prompt.includes('sibuk')) return kirim(429, { type: 'error', error: { type: 'rate_limit_error', message: 'tiruan' } });
    if (prompt.includes('kuncisalah')) return kirim(401, { type: 'error', error: { type: 'authentication_error', message: 'tiruan' } });
    if (prompt.includes('tolak')) return pesan('', 'refusal');
    if (prompt.includes('rusak')) return pesan('ini bukan JSON {');
    if (prompt.includes('sedikit')) return pesan(JSON.stringify({ soal: [soal(0), soal(1), { q: '', options: ['a', 'b', 'c', 'd'], answer: 0, explain: '' }] }));
    if (prompt.includes('campur')) return pesan(JSON.stringify({ soal: [
      soal(0), { q: 'Tiga pilihan?', options: ['a', 'b', 'c'], answer: 0, explain: 'x' }, soal(1),
      { q: 'Kunci di luar rentang?', options: ['a', 'b', 'c', 'd'], answer: 7, explain: 'x' }, soal(2),
      { q: 'Pilihan kembar?', options: ['a', 'A', 'c', 'd'], answer: 0, explain: 'x' }, soal(3),
    ] }));
    if (prompt.includes('difoto orang tua')) {
      if (prompt.includes('mata pelajaran') === false) return pesan(JSON.stringify({ teks: '', soal: [] }));
      return pesan(JSON.stringify({
        teks: `1. Hasil dari 1/2 + 1/4 adalah...\nA. 3/4\nB. 2/6\nC. 1/6\nD. 2/4\nKunci: A\n\n2. Perhatikan gambar. Berapa banyak segitiga?\n\n3. Ada ${foto.length} foto soal.`,
        soal: [
          { q: 'Hasil dari 1/2 + 1/4 adalah...', options: ['3/4', '2/6', '1/6', '2/4'], answer: 0, explain: '1/2 = 2/4, lalu 2/4 + 1/4 = 3/4.', keyGuessed: false, optionsAdded: false, perluGambar: false },
          { q: 'Perhatikan gambar. Berapa banyak segitiga?', options: ['3', '4', '5', '6'], answer: 1, explain: 'Hitung semua segitiga.', keyGuessed: true, optionsAdded: true, perluGambar: true },
          { q: `Ada ${foto.length} foto soal.`, options: ['Benar', 'Salah'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false, perluGambar: false },
        ],
      }));
    }
    const esai = (o) => ({ jenis: 'esai', options: [], answer: 0, optionsAdded: false, keyGuessed: true, explain: 'Tumbuhan membuat makanan sendiri.', ...o });
    if (prompt.includes('Berikut teks soal yang diketik orang tua') && prompt.split('<<<').pop().includes('uraian')) return pesan(JSON.stringify({ soal: [
      { jenis: 'pilihan', q: 'Hasil dari 3/4 + 1/4 adalah...', options: ['1/2', '1', '4/8', '2'], answer: 1, explain: '3 + 1 = 4, jadi 4/4 = 1.', keyGuessed: false, optionsAdded: false, contohJawaban: '', poinWajib: [], poinPelengkap: [] },
      esai({ q: 'Jelaskan proses fotosintesis!', contohJawaban: 'Fotosintesis adalah proses tumbuhan membuat makanan sendiri dengan bantuan cahaya matahari dan menghasilkan oksigen.', poinWajib: ['Tumbuhan membuat makanan sendiri', 'Membutuhkan cahaya matahari'], poinPelengkap: ['Menghasilkan oksigen'] }),
      esai({ q: 'Ibu kota Indonesia adalah ...', options: ['harus', 'dibuang'], answer: 1, optionsAdded: true, keyGuessed: false, contohJawaban: 'Jakarta', poinWajib: [], poinPelengkap: [] }),
      esai({ q: 'Poin terlalu banyak?', contohJawaban: 'x', poinWajib: ['a1', 'a2', 'a3'], poinPelengkap: ['b1', 'b2', 'b3', 'b4', ''] }),
      esai({ q: 'Esai tanpa kunci', contohJawaban: '', poinWajib: [], poinPelengkap: [] }),
    ] }));
    if (prompt.includes('Berikut teks soal yang diketik orang tua')) return pesan(JSON.stringify({ soal: [
      { q: 'Hasil dari 3/4 + 1/4 adalah...', options: ['1/2', '1', '4/8', '2'], answer: 1, explain: 'Penyebut sama, jumlahkan pembilang: 3 + 1 = 4, jadi 4/4 = 1.', keyGuessed: false, optionsAdded: false },
      { q: 'Ibu punya 12 kue, dibagi rata ke 4 anak. Tiap anak dapat berapa kue?', options: ['2', '3', '4', '6'], answer: 1, explain: '12 : 4 = 3.', keyGuessed: true, optionsAdded: true },
      { q: 'Soal rusak', options: ['a', 'b'], answer: 9, explain: '', keyGuessed: false, optionsAdded: false },
    ] }));
    return pesan(JSON.stringify({ soal: Array.from({ length: n }, (_, i) => soal(i)) }));
  });
}).listen(4010, '127.0.0.1', () => console.log('mock siap'));
