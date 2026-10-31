# Status pengerjaan Markas Latihan

Catatan serah terima untuk sesi pengerjaan berikutnya. Spesifikasi lengkap: [`brief.md`](brief.md) (ikuti brief kalau berbeda dengan prototipe). Keputusan produk: [`../README.md`](../README.md).

## Posisi sekarang

- Branch kerja: **`pengembangan`** (semua tahap baru di-push ke sini). `main` masih commit awal; digabung setelah Tahap 7 bisa dimainkan.
- Preview: https://markas-latihan-git-pengembangan-minions-3f7b.vercel.app (cek server di `/sehat`).
- Selesai dan sudah dicoba pemilik di preview: **Tahap 1–6** (urutan di brief bagian 14).

| Tahap | Isi | Lokasi utama |
|---|---|---|
| 1 | Token 5 tema, font, komponen, katalog | `app/globals.css`, `components/`, `app/katalog` |
| 2 | Halaman pembuka | `app/page.tsx` |
| 3 | Login Google, Firestore, daftar pemain | `components/AuthProvider.tsx`, `lib/server/*`, `app/api/pemain`, `app/pemain`, `app/mulai` |
| 4 | Perkenalan dengan Pipo | `app/kenalan/page.tsx` |
| 5 | Markas: kartu hadiah 4 dunia, form soal, naik kelas, pengaturan | `app/main/[id]`, `components/KartuHadiah.tsx`, `components/markas/*`, `lib/hadiah.ts` |
| 6 | Soal dibuat AI | `app/api/soal`, `lib/server/ai/*`, `lib/server/pemakaian.ts`, `lib/server/sesi.ts` |

## Berikutnya: Tahap 7

Brief 7.5–7.7, 9.2, 9.4, 8.6 (HUD), lampiran A.

1. Layar memuat (7.5): teks berganti tiap 2,6 detik per dunia, "Biasanya butuh 10–40 detik.", tombol Batal yang membatalkan permintaan (`AbortController`; `lib/api.ts` `buatSoal` sudah menerima `signal`). Sekarang form hanya menampilkan toast "… hadir di tahap 7" (`components/markas/FormSoal.tsx`).
2. Mengerjakan soal (7.6): `POST /api/soal` sudah mengembalikan `{ sesiId, soal: [{q, options}] }` tanpa kunci. Perlu endpoint cek jawaban, mis. `POST /api/sesi/[id]/jawab {nomor, pilihan}` → `{benar, answer, explain, hadiah}`; kunci dan penjelasan dibaca dari dokumen sesi `families/{uid}/players/{pid}/sesi/{sesiId}`. Jawaban satu soal hanya boleh sekali.
3. Hadiah: keputusan pemilik = **hadiah dihitung per jawaban benar** (sesi ditinggal tetap dihitung). Simpan langsung saat jawaban benar dicek (transaksi pada `rewards` pemain). Aturan ada di `lib/hadiah.ts` (`hadiahJawaban`, `syaratBoss`, `TULANG_PER_KERANGKA`, dll.). Boss Pahlawan dan kerangka Dino diselesaikan saat sesi berakhir / saat tulang mencapai 8.
4. HUD per dunia (8.6) dan halaman hasil (7.7) dengan pesan per skor.
5. Riwayat (`attempts`) dan `topic_stats` (brief 6, 9.2) → isi bagian "Riwayat latihan" dan "Saran latihan" di markas (`app/main/[id]/page.tsx`).
6. Soal contoh offline (lampiran A) + tombol "Coba soal contoh" bila AI tidak tersedia (`aiTersedia()` di `lib/server/ai/claude.ts`).
7. Tambahkan tautan kembali ke halaman utama di `/sehat`.

Setelah itu: Tahap 8 (mode admin), 9 (soal pilihan + soal mirip), 10 (aksesibilitas), 11 (uji + deploy ke `main`, domain).

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
node scripts/uji/markas-test.js /tmp/shots          # Playwright, layar 390px
npx tsx scripts/uji/hadiah-test.ts
```

Login Google asli (popup) tidak bisa diuji di container karena `apis.google.com` diblokir; build emulator menyediakan `window.__masukUji(email)`.

## Catatan kerja dengan pemilik

- Pemilik bekerja dari iPad (Safari). Beri langkah satu per satu, sertakan tautan langsung (mis. `https://vercel.com/minions-3f7b/markas-latihan/settings/environment-variables`).
- Sambungan Vercel di sesi Claude tidak bisa membuat project/deploy/membaca log; deploy dipicu dengan push ke branch. Tidak ada akses ke `*.vercel.app` dari container.
- Safari iPad mengunduh respons JSON, jadi pemeriksaan untuk pemilik dibuat sebagai halaman (`/sehat`), bukan endpoint mentah.
- Domain baru (rencana `markaslatihan.com`, beli di Vercel) harus ditambahkan ke Firebase → Authentication → Authorized domains.
