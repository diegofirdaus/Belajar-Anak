# Status pengerjaan Markas Latihan

Catatan serah terima untuk sesi pengerjaan berikutnya. Spesifikasi lengkap: [`brief.md`](brief.md) (ikuti brief kalau berbeda dengan prototipe). Keputusan produk: [`../README.md`](../README.md).

## Posisi sekarang

- Branch kerja: **`pengembangan`** (semua tahap baru di-push ke sini). `main` masih commit awal; bisa digabung kapan saja (Tahap 7 sudah dicoba pemilik).
- Preview: https://markas-latihan-git-pengembangan-minions-3f7b.vercel.app (cek server di `/sehat`).
- Selesai dan sudah dicoba pemilik di preview: **Tahap 1–7** (urutan di brief bagian 14).
- Selesai dibangun dan lulus uji di container, **belum dicoba pemilik**: **Tahap 8**.

| Tahap | Isi | Lokasi utama |
|---|---|---|
| 1 | Token 5 tema, font, komponen, katalog | `app/globals.css`, `components/`, `app/katalog` |
| 2 | Halaman pembuka | `app/page.tsx` |
| 3 | Login Google, Firestore, daftar pemain | `components/AuthProvider.tsx`, `lib/server/*`, `app/api/pemain`, `app/pemain`, `app/mulai` |
| 4 | Perkenalan dengan Pipo | `app/kenalan/page.tsx` |
| 5 | Markas: kartu hadiah 4 dunia, form soal, naik kelas, pengaturan | `app/main/[id]`, `components/KartuHadiah.tsx`, `components/markas/*`, `lib/hadiah.ts` |
| 6 | Soal dibuat AI | `app/api/soal`, `lib/server/ai/*`, `lib/server/pemakaian.ts`, `lib/server/sesi.ts` |
| 7 | Memuat, mengerjakan + HUD, hasil, hadiah per jawaban, riwayat, saran, soal contoh | `components/latihan/*`, `app/api/sesi/[id]/jawab`, `app/api/soal/contoh`, `app/api/pemain/[id]/ringkasan`, `lib/latihan.ts`, `lib/server/sesi.ts`, `lib/server/soalContoh.ts` |
| 8 | Mode admin: PIN di server, daftar & editor soal pilihan, rapikan (AI/manual) | `app/admin`, `components/admin/*`, `app/api/admin/*`, `lib/server/admin.ts`, `lib/server/soalPilihan.ts`, `lib/soalPilihan.ts` |

## Tahap 7 (selesai)

- **Alur**: markas → memuat → mengerjakan → hasil → markas, semuanya di `app/main/[id]/page.tsx` (state `layar`). Isian form disimpan di halaman markas, jadi tetap ada setelah Batal/gagal dan bisa diisi chip saran.
- **Memuat** (`LayarMemuat`): teks berganti 2,6 detik, tombol Batal memakai `AbortController`; balasan yang datang setelah batal diabaikan. Catatan: jatah harian tetap terpakai kalau dibatalkan (server tidak tahu).
- **Cek jawaban**: `POST /api/sesi/[id]/jawab {pemainId, nomor, pilihan}` → `{benar, pilihan, answer, explain, hadiah, rewards, akhir}`. Dalam satu transaksi: jawaban disimpan di `sesi.jawaban.{nomor}`, hadiah langsung ditambahkan ke `rewards` pemain. Jawaban ulang untuk nomor yang sama mengembalikan hasil pertama (tidak dobel hadiah).
- **Akhir sesi** (jawaban terakhir): boss Pahlawan (+15 XP, `bosses`+1), riwayat `players/{pid}/attempts/{sesiId}`, statistik `players/{pid}/topikStat/{sha1(topic_key)}` dengan `lv.{level} = {best, last, tries}` (hanya mudah/sedang/sulit, bukan soal contoh). Kerangka dino selesai langsung saat tulang mencapai 8.
- **Sesi ditinggal**: hadiah yang sudah didapat tetap tersimpan; tidak masuk riwayat. Ada tautan "Berhenti dan kembali ke markas" di layar mengerjakan (tambahan di luar brief, supaya anak tidak terjebak).
- **Markas**: `GET /api/pemain/[id]/ringkasan` → riwayat 8 terakhir, statistik topik, `aiTersedia`. Saran dihitung di browser (`hitungSaran`, maks 6 chip).
- **Soal contoh**: `POST /api/soal/contoh {pemainId}` (lampiran A per jenjang, `lib/server/soalContoh.ts`, hanya di server). Tombol "Coba soal contoh" tampil kalau `ANTHROPIC_API_KEY` tidak ada atau kunci ditolak (`ai_belum_siap`). Soal contoh memberi hadiah level mudah.
- Logika murni (hadiah per jawaban, banner/hadiah/teks hasil, pesan, saran) di `lib/latihan.ts`.
- `/sehat` punya tautan "Kembali ke halaman utama".

## Tahap 8 (selesai)

- **PIN admin**: di-hash scrypt + salt acak di server (`families/{uid}.adminPinHash` = `scrypt$salt$hash`). Masuk: `POST /api/admin/masuk`; 5 PIN salah → jeda 5 menit (`pinGagal`, `pinKunciSampai`, dalam transaksi). Buat/ganti: `POST /api/admin/pin` (ganti wajib sesi admin).
- **Sesi admin**: token acak, disimpan di server sebagai SHA-256 di `families/{uid}/adminSesi/{hash}` (berlaku 60 menit), dikirim lewat header `X-Admin-Sesi`. Di browser hanya disimpan di memori halaman, jadi setiap membuka mode admin PIN diminta lagi. `POST /api/admin/keluar` menghapusnya.
- **Lupa PIN**: orang tua login ulang Google (`reauthenticateWithPopup`, `prompt=login` supaya harus mengetik ulang akun), lalu `POST /api/admin/reset` hanya diterima kalau `auth_time` token ≤ 5 menit (`ADMIN_LOGIN_ULANG_DETIK` untuk uji). Belum bisa diuji di container (popup Google diblokir) — **perlu dicoba pemilik**.
- **Soal pilihan**: `families/{uid}/soalPilihan/{id}` dengan `title, kelas, subject, sourceText, questions, createdAt, updatedAt`. CRUD di `/api/admin/soal-pilihan` (+ `/[id]`), maks 100 paket, 50 soal per paket, mapel harus sesuai jenjang.
- **Rapikan**: `POST /api/admin/rapikan` memakai `claude-haiku-5-5` (`AI_MODEL_RAPIKAN`), prompt brief 10.3, structured outputs, tanpa `fallbacks`. Pilihan tidak diacak. Jatah 30/keluarga/hari (`AI_LIMIT_RAPIKAN`), terpisah dari jatah anak; dicatat di `logAi` jenis `rapikan`. Kalau AI tidak ada/kunci ditolak, editor otomatis memakai pembaca manual (`bacaManual` di `lib/soalPilihan.ts`).
- Editor: kelas bawaan mengikuti pemain yang memakai HP ini. "Keluar" kembali ke markas pemain itu (atau daftar pemain).

## Berikutnya: Tahap 9 (soal pilihan di sisi anak)

Brief 7.4 no. 4 (segmen "★ Soal pilihan", kartu paket per mapel, chip mapel lain), 7.7 (tombol hasil soal pilihan), 9.4, 10.2.
- Endpoint anak (tanpa sesi admin) untuk daftar paket **sesuai kelas pemain** — kirim judul, mapel, jumlah soal saja, tanpa kunci.
- "Kerjakan": buat sesi `sumber: "set"`, `level: "pilihan"`, `setId` dari paket (`simpanSesi` sudah mendukung; acak pilihan? sebaiknya tidak untuk soal 2–3 pilihan — putuskan).
- "Buat soal mirip (AI)": prompt 10.2, `sumber: "set_similar"`, `level: "pilihan"`, jumlah `min(10, max(5, n paket))`, pakai jatah anak.
- Halaman hasil: "Buat soal mirip (AI)", "Ulangi soal pilihan ini", "Kembali ke markas"; pesan soal pilihan sudah ada di `pesanHasil`.

Setelah itu: Tahap 10 (aksesibilitas), 11 (uji + deploy ke `main`, domain).

## Keputusan teknis penting

- **Firebase** (bukan Supabase): login Google saja; semua data lewat route server dengan Admin SDK; `firestore.rules` menolak semua akses browser.
- **`firebase-admin` 13.10.0** (bukan 14): v14 butuh Node ≥ 22.12 untuk `jose` ESM dan gagal di Vercel. `package.json` juga mengunci `engines.node = 22.x`.
- Firestore memakai **REST** (`preferRest`) di server; di emulator memakai jalur bawaan (`lib/firebase/admin.ts`).
- Kode khusus emulator dikunci `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` yang diberi nilai bawaan `"0"` di `next.config.ts`, supaya terbuang dari build asli. Cek: `grep -rl __masukUji .next/static` harus kosong.
- **Claude API**: `claude-sonnet-5-5`, effort `medium`, structured outputs, `fallbacks: "default"` + beta `server-side-fallback-2026-07-01` (tidak untuk Haiku 5.5). Jatah 20/anak, 60/keluarga per hari WIB dalam transaksi. Log token di `families/{uid}/logAi`.
- Vercel Preview menyimpan Firebase dengan nama salah ketik `FIREBASE_SERVICE_ACOUNT`; `lib/firebase/admin.ts` sementara menerima kedua nama. Hapus cadangan itu setelah pemilik mengganti nama variabelnya.

## Pengujian

Kunci asli tidak tersedia di container; uji memakai Firebase Emulator (butuh Java) dan server Claude tiruan. Skrip ada di [`../scripts/uji`](../scripts/uji).

```bash
npm run emulators                                   # terminal 1
node scripts/uji/mock-claude.mjs /tmp/mock.log      # terminal 2 (port 4010)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 npm run build
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=sk-tiruan npx next start -p 3100
node scripts/uji/api-test.mjs; node scripts/uji/api5-test.mjs; node scripts/uji/api6-test.mjs /tmp/mock.log
node scripts/uji/api7-test.mjs                      # cek jawaban, hadiah, riwayat, statistik, soal contoh
node scripts/uji/api8-test.mjs                      # PIN admin, sesi admin, soal pilihan, rapikan
# (api8-test.mjs reset-lama: jalankan server dengan ADMIN_LOGIN_ULANG_DETIK=1)
node scripts/uji/markas-test.js /tmp/shots          # Playwright, layar 390px
node scripts/uji/latihan-ui-test.js /tmp/shots      # Playwright: memuat, HUD 4 dunia, hasil, saran
node scripts/uji/admin-ui-test.js /tmp/shots        # Playwright: mode admin
npx tsx scripts/uji/hadiah-test.ts; npx tsx scripts/uji/latihan-test.ts; npx tsx scripts/uji/admin-test.ts
```

Login Google asli (popup) tidak bisa diuji di container karena `apis.google.com` diblokir; build emulator menyediakan `window.__masukUji(email)`.

## Catatan kerja dengan pemilik

- Pemilik bekerja dari iPad (Safari). Beri langkah satu per satu, sertakan tautan langsung (mis. `https://vercel.com/minions-3f7b/markas-latihan/settings/environment-variables`).
- Sambungan Vercel di sesi Claude tidak bisa membuat project/deploy/membaca log; deploy dipicu dengan push ke branch. Tidak ada akses ke `*.vercel.app` dari container.
- Safari iPad mengunduh respons JSON, jadi pemeriksaan untuk pemilik dibuat sebagai halaman (`/sehat`), bukan endpoint mentah.
- Domain baru (rencana `markaslatihan.com`, beli di Vercel) harus ditambahkan ke Firebase → Authentication → Authorized domains.
