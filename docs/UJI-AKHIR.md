# Uji akhir: kriteria penerimaan (brief bagian 15)

Dicek di container dengan Firebase Emulator dan server Claude tiruan (layar 390×844, juga 360/430 px). Skrip di `scripts/uji/`.

| # | Kriteria | Hasil | Bukti |
|---|---|---|---|
| 1 | Pembuka tampil lengkap tanpa gulir di 390×844; "Ayo Mulai!" berdenyut dan berhenti saat reduced motion | Lulus | `akhir-test.js`, `a11y-test.js` |
| 2 | Pemain baru melewati 4 langkah perkenalan; Pipo menyapa dengan nama | Lulus | `kenalan-test.js` |
| 3 | HP yang sama langsung masuk ke markas anak terakhir | Lulus | `flow-test.js` |
| 4 | Empat dunia: token, font, kartu hadiah, HUD, kalimat, banner | Lulus | `markas-test.js`, `latihan-ui-test.js` |
| 5 | Level, jumlah soal, soal pilihan selalu jelas terpilih di setiap tema | Lulus | `markas-test.js`, `pilihan-ui-test.js`, `a11y-test.js` |
| 6 | Mapel dan contoh materi sesuai jenjang | Lulus | `markas-test.js`, `akhir-test.js` (SMA) |
| 7 | Soal AI selalu 4 pilihan dan lolos validasi; penjelasan sesuai usia | Lulus (validasi); bahasa sesuai usia **dicek pemilik** dengan Claude asli | `api6-test.mjs` |
| 8 | Kunci & penjelasan baru muncul setelah anak menjawab | Lulus | `api7-test.mjs`, `latihan-ui-test.js` |
| 9 | Hadiah sesuai tabel 8.6 (boss, tujuan antariksa, kerangka dino) | Lulus | `hadiah-test.ts`, `latihan-test.ts`, `api7-test.mjs` |
| 10 | "Siap naik" setelah ≥ 80%, "Latih lagi" setelah < 60% | Lulus | `latihan-test.ts`, `latihan-ui-test.js` |
| 11 | Kartu naik kelas sekali per tahun ajaran, termasuk SD→SMP dan SMP→SMA | Lulus | `markas-test.js`, `akhir-test.js` |
| 12 | Ganti dunia tidak menghapus hadiah lama | Lulus | `markas-test.js` |
| 13 | Hapus pemain minta konfirmasi dan menghapus semua datanya | Lulus | `markas-test.js`, `api7-test.mjs` |
| 14 | Mode admin hanya dengan PIN; rapikan AI; kunci tebakan ditandai; ketuk ganti kunci; hapus soal sebelum simpan | Lulus | `admin-ui-test.js`, `api8-test.mjs` |
| 15 | Parser manual tanpa AI dengan galat per nomor | Lulus | `admin-test.ts`, `admin-ui-test.js` |
| 16 | ★ Soal pilihan hanya untuk kelas yang tepat; paket per mapel; Kerjakan & soal mirip | Lulus | `api9-test.mjs`, `pilihan-ui-test.js` |
| 17 | Batas harian AI bekerja, pesan ramah | Lulus | `api6-test.mjs batas`, `api6-test.mjs tanpa-kunci` |
| 18 | Kunci API tidak pernah di bundle browser maupun network | Lulus | `akhir-test.js` (pantau semua permintaan/respons), grep `.next/static` |
| 19 | Tanpa gulir samping di 360 px; target sentuh ≥ 44 px | Lulus | `a11y-test.js` |
| 20 | Kontras AA di kelima tema | Lulus | `kontras-test.mjs`, `a11y-test.js` (axe-core) |

Fitur tambahan di luar rilis pertama brief yang ikut dibangun atas permintaan pemilik: ekspor/hapus data keluarga, dashboard progres orang tua (v2), foto/upload soal pilihan. Uji: `api10`–`api12`, `data-keluarga-ui-test.js`, `progres-ui-test.js`, `foto-ui-test.js`.

## Hanya bisa dicek pemilik (di luar container)

- Login Google asli dan login ulang (Lupa PIN, ekspor/hapus data) di Safari iPad. **Sudah dicoba di preview.**
- Kualitas soal, penjelasan, dan pembacaan foto oleh Claude asli. **Sudah dicoba di preview.**
- Setelah rilis: `/sehat` di alamat produksi menampilkan "Beres!" dan kunci Claude terpasang; login Google di alamat produksi berhasil.
