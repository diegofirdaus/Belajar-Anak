# Markas Latihan

Web app latihan soal pilihan ganda untuk anak SD–SMA. Spesifikasi lengkap ada di [`docs/brief.md`](docs/brief.md), prototipe di [`docs/prototype.html`](docs/prototype.html).

## Keputusan (bagian 13 brief)

| Topik | Keputusan |
|---|---|
| Model akun | Satu akun orang tua (magic link / Google) dengan profil anak. HP mengingat profil terakhir. "Ganti pemain" tanpa kunci tambahan |
| Auth + database | Supabase (Auth + Postgres + RLS) |
| Kunci jawaban | Diperiksa di server. Browser hanya menerima soal tanpa kunci |
| Batas AI harian | 20 paket per anak, 60 per akun. Merapikan soal admin 30 per akun. Bisa diatur lewat env |
| Model AI | `claude-sonnet-5-5` untuk membuat soal, `claude-haiku-5-5` untuk merapikan. Bisa diatur lewat env |
| Sesi ditinggal | Hadiah dihitung sebagian: tiap jawaban benar langsung disimpan saat dicek di server |
| Admin | PIN 4 angka di-hash di server, 5 percobaan lalu jeda 5 menit, reset lewat login orang tua |
| Hosting | Vercel, subdomain `*.vercel.app` dulu |

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi nilainya (tahap 3 ke atas)
npm run dev
```

Katalog komponen: `/katalog`.
