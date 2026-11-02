# Markas Latihan

Web app latihan soal pilihan ganda untuk anak SD–SMA. Spesifikasi lengkap ada di [`docs/brief.md`](docs/brief.md), prototipe di [`docs/prototype.html`](docs/prototype.html).

## Keputusan (bagian 13 brief)

| Topik | Keputusan |
|---|---|
| Model akun | Satu akun orang tua (login Google) dengan profil anak. HP mengingat profil terakhir. "Ganti pemain" tanpa kunci tambahan |
| Auth + database | Firebase (project baru `markas-latihan`): Auth dengan Google, Firestore. Semua baca/tulis data lewat server Next.js (Admin SDK). Security Rules menolak akses langsung dari browser |
| Kunci jawaban | Diperiksa di server. Browser hanya menerima soal tanpa kunci |
| Batas AI harian | 20 paket per anak, 60 per akun. Merapikan soal admin 30 per akun. Bisa diatur lewat env |
| Model AI | `claude-sonnet-5-5` (effort `medium`, server-side fallback aktif) untuk membuat soal, `claude-haiku-5-5` untuk merapikan. Bisa diatur lewat env. Perkiraan ± USD 0,03 per paket 5 soal; biaya tercatat per permintaan di `families/{uid}/logAi` |
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

## Variabel wajib di Vercel

Semua bertipe **Secret**, dicentang untuk **Production** dan **Preview**. Variabel baru hanya terbaca oleh deploy berikutnya.

| Nama | Isi |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Seluruh isi file JSON service account Firebase |
| `ANTHROPIC_API_KEY` | Kunci Claude API (`sk-ant-…`) dari Claude Console |

Cek dengan membuka `/sehat` di alamat deploy: harus tampil "Beres!" dan "Kunci Claude API: terpasang".

Opsional (punya nilai bawaan):

| Nama | Bawaan | Isi |
|---|---|---|
| `AI_LIMIT_PER_PLAYER` / `AI_LIMIT_PER_FAMILY` | 20 / 60 | Jatah paket soal AI per anak / per keluarga per hari (WIB) |
| `AI_LIMIT_RAPIKAN` | 30 | Jatah "Rapikan soal" + baca foto per keluarga per hari |
| `AI_MODEL_SOAL` | `claude-sonnet-5-5` | Model pembuat soal & soal mirip |
| `AI_MODEL_RAPIKAN` | `claude-haiku-5-5` | Model merapikan teks soal admin |
| `AI_MODEL_BACA_FOTO` | `claude-sonnet-5-5` | Model membaca foto soal |

## Firebase

- Konfigurasi web ada di `lib/firebase/config.ts` (publik).
- `FIREBASE_SERVICE_ACCOUNT` (JSON service account, satu baris) wajib di server: `.env.local` dan Vercel → Settings → Environment Variables.
- Aturan Firestore di `firestore.rules`: semua akses langsung dari browser ditolak. Data hanya lewat route `app/api/*` yang memeriksa token login orang tua.
- Setiap domain tempat app dibuka harus ada di Firebase → Authentication → Settings → Authorized domains. Alamat `*.vercel.app` **tidak** otomatis diizinkan: alamat preview dan alamat produksi masing-masing harus ditambahkan.

## Struktur data (Firestore)

```
families/{uid}                     createdAt, adminPinHash (scrypt), pinGagal, pinKunciSampai
families/{uid}/players/{id}        name, kelas, theme, academicYear, rewards, createdAt
families/{uid}/players/{id}/sesi/{sesiId}       paket soal lengkap dengan kunci (tidak pernah dikirim ke browser sebelum dijawab), jawaban
families/{uid}/players/{id}/attempts/{sesiId}   riwayat latihan selesai: mapel, topik, level, sumber, skor, jawaban per soal
families/{uid}/players/{id}/topikStat/{hash}    statistik topik per level (best, last, tries) untuk saran
families/{uid}/soalPilihan/{id}                 soal pilihan orang tua (judul, kelas, mapel, teks asli, soal, saklar acak pilihan)
families/{uid}/adminSesi/{sha256}               sesi mode admin (60 menit)
families/{uid}/pemakaian/{YYYY-MM-DD}           jatah AI harian (WIB): total, perPemain, rapikan
families/{uid}/logAi/{id}                       model, token masuk/keluar, hasil per permintaan AI (tanpa isi foto)
```
