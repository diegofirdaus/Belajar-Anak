# Markas Latihan

Web app latihan soal pilihan ganda untuk anak SD–SMA. Spesifikasi lengkap ada di [`docs/brief.md`](docs/brief.md), prototipe di [`docs/prototype.html`](docs/prototype.html).

## Keputusan (bagian 13 brief)

| Topik | Keputusan |
|---|---|
| Model akun | Satu akun orang tua (login Google) dengan profil anak. HP mengingat profil terakhir. "Ganti pemain" tanpa kunci tambahan |
| Auth + database | Firebase (project baru `markas-latihan`): Auth dengan Google, Firestore. Semua baca/tulis data lewat server Next.js (Admin SDK). Security Rules menolak akses langsung dari browser |
| Kunci jawaban | Diperiksa di server. Browser hanya menerima soal tanpa kunci |
| Batas AI harian | 20 paket per anak, 60 per akun. Merapikan soal admin 30 per akun. Bisa diatur lewat env |
| Model AI | `claude-sonnet-5-5` untuk membuat soal, `claude-haiku-5-5` untuk merapikan. Bisa diatur lewat env |
| Sesi ditinggal | Hadiah dihitung sebagian: tiap jawaban benar langsung disimpan saat dicek di server |
| Admin | PIN 4 angka di-hash di server, 5 percobaan lalu jeda 5 menit, reset lewat login orang tua |
| Hosting | Vercel, subdomain `*.vercel.app` dulu |

## Menjalankan

```bash
npm install
npm run dev            # butuh FIREBASE_SERVICE_ACCOUNT di .env.local
```

Tanpa kredensial, pakai Firebase Emulator (butuh Java):

```bash
npm run emulators      # terminal 1
npm run dev:emu        # terminal 2
```

Katalog komponen: `/katalog`.

## Firebase

- Konfigurasi web ada di `lib/firebase/config.ts` (publik).
- `FIREBASE_SERVICE_ACCOUNT` (JSON service account, satu baris) wajib di server: `.env.local` dan Vercel → Settings → Environment Variables.
- Aturan Firestore di `firestore.rules`: semua akses langsung dari browser ditolak. Data hanya lewat route `app/api/*` yang memeriksa token login orang tua.
- Setiap domain tempat app dibuka harus ada di Firebase → Authentication → Settings → Authorized domains.

## Struktur data (Firestore)

```
families/{uid}                     createdAt, adminPinHash
families/{uid}/players/{id}        name, kelas, theme, academicYear, rewards, createdAt
```
