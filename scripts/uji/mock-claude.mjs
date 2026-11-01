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
    const prompt = b.messages?.[0]?.content ?? '';
    fs.appendFileSync(LOG, JSON.stringify({ path: req.url, headers: { beta: req.headers['anthropic-beta'] ?? null, key: req.headers['x-api-key'] ? 'ada' : null }, body: b }) + '\n');
    const n = Number(/Buat (\d+) soal/.exec(prompt)?.[1] ?? 5);
    const kirim = (status, data) => { res.writeHead(status, { 'content-type': 'application/json', 'request-id': 'req_tiruan' }); res.end(JSON.stringify(data)); };
    const pesan = (teks, stop = 'end_turn') => kirim(200, {
      id: 'msg_' + ++urutan, type: 'message', role: 'assistant', model: b.model,
      content: [{ type: 'text', text: teks }], stop_reason: stop, stop_sequence: null,
      stop_details: stop === 'refusal' ? { type: 'refusal', category: 'general_harms', explanation: 'tiruan' } : null,
      usage: { input_tokens: 700, output_tokens: 1200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    });
    const soal = (i) => ({ q: `Soal nomor ${i + 1}?`, options: [`Benar ${i + 1}`, `Salah A${i}`, `Salah B${i}`, `Salah C${i}`], answer: 0, explain: `Karena benar ${i + 1}.` });

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
    return pesan(JSON.stringify({ soal: Array.from({ length: n }, (_, i) => soal(i)) }));
  });
}).listen(4010, '127.0.0.1', () => console.log('mock siap'));
