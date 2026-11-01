# Brief Claude Code: Markas Latihan

Web app latihan soal pilihan ganda untuk anak SD sampai SMA. Soal dibuat oleh AI (Claude API) dari materi yang diketik anak, atau diambil dari soal pilihan yang diketik orang tua. Setiap jawaban benar memberi hadiah di "dunia" yang dipilih anak, supaya anak semangat berlatih.

Brief ini disusun dari prototipe yang sudah dicoba di Claude. File prototipe (`markas-latihan-prototype.html`) dilampirkan sebagai acuan tampilan dan perilaku. Kalau brief dan prototipe berbeda, **ikuti brief ini**.

---

## 0. Cara memakai brief ini

1. Baca seluruh brief dan buka file prototipe di browser untuk melihat tampilan dan alurnya.
2. Sebelum mulai menulis kode, ajukan pertanyaan untuk hal yang belum jelas, terutama di bagian **13. Keputusan yang masih terbuka**.
3. Bangun bertahap mengikuti urutan di bagian **14. Urutan pengerjaan**. Tunjukkan hasil setiap tahap sebelum lanjut.
4. Semua teks yang dilihat pengguna memakai **Bahasa Indonesia**. Teks UI di brief ini adalah teks final. Pakai persis, kecuali ada alasan kuat untuk mengubahnya.

---

## 1. Ringkasan produk

| Hal | Isi |
|---|---|
| Nama | Markas Latihan |
| Masalah | Orang tua ingin cepat membuat contoh soal latihan untuk anak, sesuai kelas dan pelajaran |
| Pengguna utama | Anak SD kelas 1 sampai SMA kelas 12 (pemain) |
| Pengguna kedua | Orang tua (admin): membuat soal pilihan, memantau progres |
| Perangkat utama | HP anak masing-masing, jadi desainnya **mobile-first** |
| Bentuk soal | Pilihan ganda, dinilai otomatis |
| Kurikulum | Kurikulum Merdeka (Indonesia) |
| Bahasa | Bahasa Indonesia |

### Inti pengalaman
1. Halaman pembuka yang menarik dengan tombol "Ayo Mulai!".
2. Perkenalan dengan maskot **Pipo** dalam gaya chat: nama panggilan, jenjang, kelas, dan pilihan dunia.
3. Markas sesuai dunia yang dipilih. Di sini anak membuat soal dan melihat hadiahnya.
4. Mengerjakan soal. Setelah menjawab, anak langsung melihat benar/salah, kunci jawaban, dan penjelasan yang ramah anak.
5. Hadiah bertambah sesuai dunia. App menyarankan naik level kalau anak sudah menguasai materi.

---

## 2. Peran dan akun

> Keputusan final soal akun ada di bagian 13. Rekomendasi di bawah dipakai sebagai titik awal.

- **Akun orang tua (pemilik):** login dengan email (magic link atau Google). Satu akun orang tua bisa punya beberapa profil anak.
- **Profil anak (pemain):** hanya berisi nama panggilan, kelas, dan dunia. Tanpa email, nama lengkap, nama sekolah, foto, atau tanggal lahir.
- **Pemakaian di HP anak:** orang tua login sekali di HP anak, lalu HP mengingat profil anak yang memakainya. Saat app dibuka lagi, app langsung masuk ke markas anak itu. Ada tombol "Ganti pemain".
- **Mode admin:** hanya untuk orang tua. Di prototipe dilindungi PIN 4 angka. Di versi rilis, mode admin minimal butuh PIN yang di-hash di server, dan lebih baik lagi meminta konfirmasi login orang tua.
- Tidak ada fitur main bersama atau multiplayer.

---

## 3. Keputusan produk yang sudah diambil

| No | Keputusan |
|---|---|
| 1 | Alurnya: orang tua atau anak memberi tema, soal dibuat otomatis, lalu anak mengerjakan di app |
| 2 | Hanya pilihan ganda (4 pilihan, A sampai D) |
| 3 | Sumber soal: ketik tema (sudah ada) dan upload foto buku/LKS (**versi berikutnya**, belum dibangun) |
| 4 | App mencatat hasil per anak, termasuk topik yang lemah, untuk saran latihan |
| 5 | Awalnya untuk keluarga sendiri, tapi struktur data harus siap dipakai banyak keluarga |
| 6 | Mobile-first, karena anak memakai HP masing-masing |
| 7 | Anak boleh membuat soal sendiri. Orang tua bisa membuat soal pilihan dan melihat progres |
| 8 | Setelah menjawab: benar/salah, lalu kunci jawaban, lalu penjelasan dengan bahasa sesuai usia |
| 9 | Level dipilih manual (mudah, sedang, sulit). Mulai dari mudah, dan app menyarankan naik level kalau sudah dikuasai |
| 10 | Mode "Latihan" (santai) dan "Simulasi Ulangan" dengan timer (**versi berikutnya**, belum dibangun) |
| 11 | Ada 4 dunia: Dunia Blok, Arena Pahlawan, Misi Antariksa, Lembah Dino. Semuanya desain orisinal (lihat bagian 8.6) |
| 12 | Perkenalan menanyakan nama panggilan, jenjang (SD/SMP/SMA), kelas, lalu dunia |
| 13 | Kelas bisa diubah. Setiap tahun ajaran baru (mulai Juli), app bertanya "Kamu sudah naik kelas belum?" |
| 14 | Pilihan jurusan atau mapel pilihan untuk SMA kelas 11–12: **versi berikutnya** |
| 15 | Mode admin: orang tua mengetik soal dengan bebas, AI merapikan, orang tua mengecek, lalu menyimpan. Soal ditargetkan ke kelas dan mata pelajaran tertentu |
| 16 | Soal pilihan bisa dikerjakan apa adanya, atau dipakai AI sebagai contoh untuk membuat soal yang mirip |

---

## 4. Ruang lingkup

### Masuk rilis pertama
- Halaman pembuka
- Login orang tua dan daftar profil anak
- Perkenalan dengan Pipo
- Markas untuk 4 dunia, dengan hadiah masing-masing
- Pembuatan soal oleh AI (ketik materi, pilih level dan jumlah soal)
- Mengerjakan soal, umpan balik, dan halaman hasil
- Riwayat latihan dan saran latihan
- Pengaturan: ubah kelas, ganti dunia, ganti nama, hapus pemain
- Pertanyaan naik kelas di tahun ajaran baru
- Mode admin: membuat, mengubah, dan menghapus soal pilihan
- Soal pilihan di sisi anak: kerjakan, atau buat soal mirip dengan AI
- Soal contoh offline saat AI tidak tersedia
- Batas pemakaian AI per anak per hari

### Belum masuk (versi berikutnya)
- Upload foto buku/LKS sebagai sumber soal
- Mode Simulasi Ulangan dengan timer
- Daftar materi resmi Capaian Pembelajaran per fase sebagai pilihan topik
- Tombol "Lapor soal salah"
- Pilihan jurusan atau mapel pilihan SMA
- Dashboard progres khusus orang tua (di rilis pertama cukup lewat daftar pemain dan markas)
- Lencana pencapaian dan streak harian

---

## 5. Arsitektur yang disarankan

> Ini rekomendasi. Silakan usulkan alternatif kalau ada alasan kuat, tapi jelaskan dulu sebelum membangun.

| Bagian | Rekomendasi |
|---|---|
| Frontend | Next.js (App Router) + TypeScript. CSS memakai custom properties (token) per tema, tanpa framework UI berat |
| Hosting | Vercel |
| Auth + database | Supabase (Auth + Postgres + Row Level Security), atau setara |
| AI | Claude API (Anthropic), dipanggil **hanya dari server** (route handler atau server action) |
| Kunci API | `ANTHROPIC_API_KEY` di environment variable server. Tidak boleh pernah sampai ke browser |
| Model | Bisa dikonfigurasi lewat env. Usulan: `claude-sonnet-5-5` untuk membuat soal dan `claude-haiku-5-5` untuk merapikan soal admin. Uji kualitas dan biayanya |
| Font | Google Fonts lewat `next/font` |

### Aturan untuk endpoint AI
- Semua permintaan ke AI lewat endpoint server yang memeriksa login dan kepemilikan profil.
- **Batas harian per anak** (usulan awal 20 paket soal per hari, bisa diatur) dan **batas per akun**. Kalau batas tercapai, tampilkan: "Jatah membuat soal hari ini sudah habis. Besok bisa lagi, ya!"
- Validasi semua output AI di server dengan skema (misalnya zod) sebelum dikirim ke browser. Buang soal yang tidak valid.
- Catat pemakaian token per permintaan untuk memantau biaya.
- Batas panjang input: topik maksimal 120 karakter, teks admin maksimal 20.000 karakter.

---

## 6. Model data

Nama tabel boleh disesuaikan. Struktur intinya:

### `families` / akun orang tua
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid | dari auth |
| admin_pin_hash | text, nullable | hash dengan salt, diproses di server |
| created_at | timestamptz | |

### `players` (profil anak)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid | |
| family_id | uuid | FK |
| name | text | nama panggilan, 1–20 karakter |
| kelas | int | 1–12. Jenjang diturunkan dari kelas: 1–6 SD, 7–9 SMP, 10–12 SMA |
| theme | text | `blok` \| `pahlawan` \| `antariksa` \| `dino` |
| academic_year | int | tahun ajaran saat kelas terakhir dikonfirmasi (lihat 9.3) |
| rewards | jsonb | lihat di bawah. Hadiah tiap dunia disimpan terpisah, jadi pindah dunia tidak menghapus hadiah lama |
| created_at | timestamptz | |

`rewards`:
```json
{
  "blok": { "kayu": 0, "batu": 0, "permata": 0 },
  "pahlawan": { "xp": 0, "bosses": 0 },
  "antariksa": { "fuel": 0 },
  "dino": { "bones": 0, "done": ["T-Rex"] }
}
```

### `attempts` (riwayat latihan)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid | |
| player_id | uuid | FK |
| subject | text | |
| topic | text | |
| level | text | `mudah` \| `sedang` \| `sulit` \| `pilihan` |
| set_id | uuid, nullable | kalau berasal dari soal pilihan |
| source | text | `ai` \| `set` \| `set_similar` \| `demo` |
| n | int | jumlah soal |
| correct | int | |
| answers | jsonb | per soal: teks soal, pilihan, kunci, jawaban anak (untuk analisis topik lemah ke depan) |
| created_at | timestamptz | |

### `topic_stats` (untuk saran latihan)
Kunci: `player_id` + `topic_key` + `level`. `topic_key` = `lowercase(subject + "|" + topic)` dengan spasi dirapikan.

Kolom: `best_pct`, `last_pct`, `tries`, `updated_at`. Hanya level `mudah`, `sedang`, dan `sulit` yang dicatat. Soal pilihan dan soal contoh tidak dicatat.

### `question_sets` (soal pilihan dari admin)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid | |
| family_id | uuid | FK |
| title | text | maksimal 60 karakter. Kalau kosong: `"{Mapel} Kelas {k} {Jenjang}"` |
| kelas | int | 1–12, target kelas yang tepat |
| subject | text | |
| source_text | text | teks asli yang diketik admin, supaya bisa diedit ulang |
| questions | jsonb | array soal (lihat di bawah) |
| created_at, updated_at | timestamptz | |

Bentuk satu soal:
```json
{ "q": "Hasil dari 3/4 + 1/4 adalah…", "options": ["1/2","1","4/8","2"], "answer": 1,
  "explain": "…", "keyGuessed": false, "optionsAdded": false }
```
- `options` berisi 2–4 item (soal admin yang dibaca tanpa AI boleh kurang dari 4). Soal buatan AI selalu 4.
- `answer` adalah indeks dari 0.

Row Level Security: setiap baris hanya bisa dibaca dan ditulis oleh keluarga pemiliknya.

---

## 7. Layar dan alur

Peta alur:

```
Halaman pembuka ──Ayo Mulai!──┬─(HP ini sudah punya pemain)──> Markas pemain itu
                              ├─(akun punya pemain)─────────> Siapa yang mau main?
                              └─(belum ada pemain)──────────> Perkenalan
Siapa yang mau main? ─> [kartu pemain] Markas │ [+ Pemain baru] Perkenalan │ [Mode admin] PIN
Perkenalan ─> Markas
Markas ─> Memuat soal ─> Mengerjakan ─> Hasil ─> Markas
Markas ─> Pengaturan (ubah kelas / ganti dunia / ganti nama / hapus / mode admin)
```

Login orang tua terjadi sebelum halaman "Siapa yang mau main?" kalau belum login. Usulan: halaman pembuka tetap tampil, lalu "Ayo Mulai!" mengarah ke login kalau sesi belum ada.

Layar netral (pembuka, pemain, perkenalan, admin) memakai **tema dasar**. Layar markas, memuat, mengerjakan, dan hasil memakai **tema dunia** milik pemain.

### 7.1 Halaman pembuka
- Panel bergaya kartu dengan sudut membulat 24px dan border 3px `#2a2017`. Tinggi `min(660px, 100svh - 56px)`. Konten di tengah, padding bawah 120px untuk karakter.
- **Latar dibelah miring 118°:** kiri langit siang `#bfe2f3`, kanan malam `#141a33`. Ditambah cahaya radial merah di kanan bawah (`rgba(226,71,90,.55)`) dan ungu di kanan atas (`rgba(122,92,220,.45)`).
- **Hiasan (semua `aria-hidden`):**
  - Matahari pixel 30px `#ffd34a` dengan cincin `#ffe58f` di kiri atas.
  - Tiga blok pixel 30px yang naik-turun pelan (animasi `bob` 3,2s, waktu mulai berbeda): kayu `#9a6a3f`, batu `#8d949b`, permata `#3fc3c9` dengan cahaya.
  - Bintang 4px berkelip (`twinkle` 2,4s) di sisi kanan.
  - Planet bercincin (gradasi `#ffe3a3` ke `#d9a066`, cincin `#f2d9a0`) di kanan atas.
  - Lambang belah ketupat emas `#f2b53a` yang berpendar (`glow` 2,6s).
  - Tanah pixel kiri bawah (garis cokelat dengan rumput `#4f9a3a`) dan lantai arena kanan bawah (gradasi `#2b335c`–`#161b33`, garis atas emas).
  - Karakter penjelajah kotak di kiri bawah (kepala `#e9b98a`, baju `#2fa3a9`, celana `#3a4a9a`) dan perisai emas di kanan bawah. Keduanya naik-turun pelan.
- **Panel judul di tengah:** latar `#fff7e8`, border 3px `#2a2017`, bayangan keras `6px 6px 0 #2a2017`, lebar maksimal 360px. Masuk dengan animasi `rise` 0,6s (hanya transform, tanpa opacity 0).
  - Eyebrow "LATIHAN SOAL KELUARGA" (Pixelify Sans, huruf kapital, spasi huruf .12em, `#6a5846`)
  - Judul baris 1 **"Markas"** (Pixelify Sans 700, `clamp(2.5rem, 12vw, 3.3rem)`, `#2a2017`, bayangan teks `3px 3px 0 #e7a823`)
  - Judul baris 2 **"LATIHAN"** (Chakra Petch 700, huruf kapital, spasi huruf .16em, teks `#f2b53a` di pita `#141a33` berbentuk jajaran genjang)
  - Teks: "Jawab soal, kumpulkan hadiah, dan bangun duniamu sendiri. Makin rajin latihan, makin hebat duniamu!"
  - Tombol **"▶ Ayo Mulai!"**: Pixelify Sans 1,4rem, latar `#e7a823`, border 3px, bayangan keras 4px, berdenyut (`pulse` 1,8s, skala 1 ke 1,05). Saat ditekan bergeser 3px dan bayangan mengecil.
  - Empat label dunia, masing-masing memakai font dunianya: Dunia Blok (hijau `#3c8f35`), Arena Pahlawan (`#141a33`/emas), Misi Antariksa (`#1c2560`/cyan `#5ee0ff`), Lembah Dino (oranye `#e8832a`).

### 7.2 Siapa yang mau main?
- Header: maskot Pipo besar, eyebrow "MARKAS LATIHAN", judul "Siapa yang mau main?".
- Daftar kartu pemain (urut dari yang dibuat paling awal). Tiap kartu: tile gambar dunia 64×56, nama (1,15rem tebal), lalu "Kelas 5 SD · Dunia Blok".
- Tombol "+ Pemain baru" dengan border putus-putus 2px.
- Teks kecil status penyimpanan.
- Tautan: "Kembali ke halaman pembuka" dan "Mode admin (untuk orang tua)".
- Kalau belum ada pemain: "Belum ada pemain. Tekan "Pemain baru" untuk berkenalan dengan Pipo."

### 7.3 Perkenalan dengan Pipo (gaya chat)
- Header: Pipo, eyebrow "KENALAN DULU, YUK", 4 garis indikator langkah (aktif = warna aksen), tautan "Batal" (hanya kalau sudah ada pemain lain, kembali ke daftar pemain).
- Pesan Pipo muncul satu per satu sebagai gelembung kiri dengan avatar Pipo kecil. Sebelum teks muncul, tampil indikator mengetik (3 titik) selama sekitar 550ms. Jeda antar pesan sekitar 180ms. Kalau `prefers-reduced-motion`, tanpa jeda.
- Jawaban anak muncul sebagai gelembung kanan berwarna aksen.
- Area input di bawah chat berganti sesuai langkah. Halaman otomatis bergulir supaya area input terlihat.

| Langkah | Pesan Pipo | Input |
|---|---|---|
| 1 | "Halo! Aku **Pipo**, pemandu di Markas Latihan." lalu "Biar akrab, kamu biasa dipanggil siapa?" | Kolom teks (placeholder "Nama panggilan kamu", maks 20) + tombol "Lanjut". Kalau kosong: "Tulis dulu nama panggilanmu, ya." |
| 2 | "Hai, **{nama}**! Senang kenalan sama kamu." lalu "Sekarang kamu sekolah di mana?" | 3 tombol besar: **SD** / Sekolah Dasar, **SMP** / Sekolah Menengah Pertama, **SMA** / Sekolah Menengah Atas |
| 3 | "Oke, {jenjang}! Kamu kelas berapa?" | Grid 3 kolom. SD: Kelas 1–6. SMP: Kelas 7–9 dengan subjudul "kelas 1 SMP" dst. SMA: Kelas 10–12 dengan subjudul "kelas 1 SMA" dst. |
| 4 | "Kelas {k}, siap! Nanti soal-soalnya aku sesuaikan dengan pelajaran {Kelas k Jenjang}." lalu "Terakhir nih. Kamu mau berpetualang di dunia yang mana?" | Grid 2 kolom kartu dunia (1 kolom di bawah 340px). Kartu: tile gambar 84px, nama dunia dengan font dunianya, deskripsi singkat |
| 5 | "Pilihan keren! Selamat datang di **{dunia}**, {nama}." lalu teks hadiah dunia (lihat 8.6) | Tombol "Masuk ke markas" + tautan "Ulangi perkenalan" |

Setelah "Masuk ke markas": buat profil, simpan, tandai HP ini memakai profil tersebut, lalu buka markas.

### 7.4 Markas
Urutan dari atas ke bawah:

1. **Topbar:** eyebrow nama dunia, judul nama anak, subjudul "Kelas 5 SD · Fase C Kurikulum Merdeka". Tombol "Ganti pemain" (ghost, kecil) di kanan.
2. **Kartu naik kelas** (hanya kalau perlu, lihat 9.3). Border kiri 6px warna aksen.
3. **Kartu hadiah** sesuai dunia (lihat 8.6).
4. **Form membuat soal.** Judulnya per dunia: Blok "Ambil misi baru", Pahlawan "Pilih pertarungan", Antariksa "Siapkan peluncuran", Dino "Ekspedisi baru".
   - **Mata pelajaran** (select), daftarnya per jenjang (lihat 9.1).
   - **Materi atau tema** (teks, maks 120). Placeholder per jenjang: SD "contoh: pecahan senilai", SMP "contoh: bilangan bulat negatif", SMA "contoh: hukum Newton".
   - **Level**: tombol segmen 3 kolom (mudah, sedang, sulit). Yang terpilih: latar aksen, tanda "✓ " di depan, dan cincin `0 0 0 3px` aksen 35%. Default mudah.
   - **★ Soal pilihan**: tombol segmen selebar penuh di bawah ketiga level. Hanya muncul kalau ada soal pilihan untuk kelas anak ini.
   - **Jumlah soal**: segmen 2 kolom, "5 soal" (default) dan "10 soal".
   - Pesan error (merah, tebal).
   - Tombol utama, labelnya per dunia: "Mulai menambang soal" / "Masuk arena" / "Luncurkan misi" / "Mulai menggali".
   - Tombol "Coba soal contoh" (ghost) hanya kalau AI tidak tersedia.
   - Kalau topik kosong: "Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak"."
   - **Kalau ★ Soal pilihan dipilih:** sembunyikan kolom materi, jumlah soal, dan tombol utama. Tampilkan "Pilih paket soal" berisi kartu paket untuk mata pelajaran terpilih. Tiap kartu: judul, "{n} soal · {mapel}", tombol **"Kerjakan"** dan **"Buat soal mirip (AI)"** (nonaktif kalau AI tidak tersedia). Kalau mapel itu belum punya paket: "Belum ada soal pilihan untuk {mapel}. Ada soal pilihan untuk pelajaran ini:" lalu chip mapel yang punya paket. Mengetuk chip akan mengganti mapel.
5. **Saran latihan** (hanya kalau ada). Chip yang bisa diketuk untuk mengisi form otomatis:
   - "Siap naik: {topik} → {level berikut}" (border hijau)
   - "Latih lagi: {topik} ({level})" (border merah)
   - Maksimal 6 chip.
6. **Riwayat latihan:** 8 terakhir. Tiap baris: topik tebal, skor "4/5" di kanan, baris kecil "{mapel} · {level} · 24 Okt". Kalau kosong: "Belum ada latihan. Hasil latihan pertamamu akan muncul di sini."
7. **Pengaturan:** tombol kecil "Ubah kelas", "Ganti dunia", "Ganti nama", "Hapus pemain" (teks merah), "Mode admin". Panel muncul di bawahnya:
   - **Ubah kelas:** pilih jenjang lalu kelas. Toast: "Kelas diubah ke {Kelas k Jenjang}."
   - **Ganti dunia:** "Pilih dunia. Hadiah di dunia lama tetap tersimpan." lalu grid kartu dunia.
   - **Ganti nama:** kolom teks + "Simpan".
   - **Hapus pemain:** "**Hapus {nama}?** Semua hadiah dan riwayat latihannya ikut terhapus dan tidak bisa dikembalikan." dengan tombol "Ya, hapus" (merah) dan "Batal". Toast: "{nama} sudah dihapus."

### 7.5 Memuat soal
- Kartu di tengah: spinner (Dunia Blok memakai kotak yang melompat, bukan lingkaran), judul berganti setiap 2,6 detik, teks "Biasanya butuh 10–40 detik.", tombol "Batal" yang membatalkan permintaan.
- Teks per dunia:
  - Blok: "Menambang soal…", "Menggali bahan materi…", "Menyusun blok-blok soal…"
  - Pahlawan: "Memanggil boss materi…", "Menyiapkan arena…", "Mengasah senjata…"
  - Antariksa: "Mengisi bahan bakar…", "Menghitung mundur…", "Menyalakan mesin roket…"
  - Dino: "Menyiapkan sekop…", "Menggali tanah purba…", "Membersihkan fosil…"

### 7.6 Mengerjakan soal
- Baris atas: tag "{level} · {topik}" (untuk soal pilihan: "soal pilihan · {judul}") dan "Soal 2 dari 5".
- Indikator titik per soal (14×8px): hijau benar, merah salah, aksen untuk soal sekarang.
- **Kartu HUD** sesuai dunia (lihat 8.6).
- **Kartu soal:** teks soal 1,2rem tebal, lalu tombol pilihan dengan kotak huruf A–D 30px. Tinggi minimal 54px.
- Setelah memilih, semua pilihan terkunci. Jawaban benar diberi border hijau dengan latar hijau 18% dan kotak huruf hijau. Pilihan salah yang dipilih diberi warna merah dengan cara yang sama.
- **Kartu umpan balik** (border kiri 6px hijau atau merah):
  - Benar: kalimat acak per dunia (lihat 8.6). Salah: "Belum tepat, {nama}. Tidak apa-apa!"
  - Hadiah yang didapat (animasi `pop`), misalnya "+1 kayu"
  - "Jawaban yang benar: B. 1"
  - Penjelasan
  - Tombol "Soal berikutnya" atau "Lihat hasil"
- Kartu umpan balik otomatis digulir ke area terlihat.
- Kunci jawaban **tidak pernah** dikirim ke browser sebelum anak menjawab. Usulan: server mengirim soal tanpa kunci, lalu jawaban diperiksa lewat endpoint. Alternatif yang lebih sederhana: kirim semuanya tapi tidak ditampilkan. Putuskan bersama (lihat bagian 13).

### 7.7 Hasil
- Kartu di tengah: banner per dunia (lihat 8.6), skor besar "4/5" (3,2rem, font dunia), "80% benar · {topik} · level {level}", hadiah total, teks tambahan (misalnya naik rank, tiba di planet baru, kerangka selesai), lalu pesan.
- **Pesan:**
  - ≥80% dan masih ada level berikutnya: "Kerja bagus, {nama}! Kamu sudah menguasai level {level}. Siap coba level {berikut}?"
  - ≥80% di level sulit: "Luar biasa, {nama}! Level sulit pun sudah kamu kuasai."
  - 60–79%: "Sedikit lagi, {nama}. Ulangi level {level} dengan soal baru supaya makin mantap."
  - <60%: "Tidak apa-apa, {nama}. Baca lagi penjelasan tadi, lalu coba soal baru di level yang sama. Pelan-pelan pasti bisa."
  - Soal pilihan: ≥80% "Kerja bagus, {nama}! Soal pilihan ini sudah kamu kuasai." / 60–79% "Sedikit lagi, {nama}. Coba soal yang mirip supaya makin mantap." / <60% "Tidak apa-apa, {nama}. Baca lagi penjelasannya, lalu ulangi soal ini."
- **Tombol:**
  - Soal AI: "Coba level {berikut}" (kalau ≥80%), "Soal baru, level sama", "Kembali ke markas"
  - Soal pilihan: "Buat soal mirip (AI)", "Ulangi soal pilihan ini", "Kembali ke markas"
  - Soal contoh: hanya "Kembali ke markas"

### 7.8 Mode admin
Header: Pipo, badge "MODE ADMIN" (latar warna teks, teks warna latar, kapital), judul layar, tombol "Keluar" (kembali ke markas pemain aktif atau ke daftar pemain).

**PIN**
- Pertama kali: "Buat PIN 4 angka untuk mode admin. Simpan baik-baik dan jangan beri tahu anak-anak, ya." dengan kolom "PIN baru" dan "Ulangi PIN" (input password, `inputmode=numeric`, teks di tengah, spasi huruf .6em, 1,4rem), lalu tombol "Simpan PIN".
- Berikutnya: "Masukkan PIN admin untuk mengatur soal pilihan." lalu tombol "Masuk".
- Error: "PIN harus 4 angka." / "PIN yang diulang belum sama. Coba ketik lagi." / "PIN salah. Coba lagi."
- Versi rilis: verifikasi di server, batasi percobaan (misalnya 5 kali lalu jeda 5 menit), dan sediakan cara reset lewat login orang tua.

**Daftar soal pilihan**
- Penjelasan: "Soal yang Anda ketik di sini muncul sebagai tombol **★ Soal pilihan** untuk anak di kelas dan pelajaran yang sesuai. Anak bisa mengerjakannya apa adanya, atau meminta AI membuat soal yang mirip."
- Tombol "+ Tambah soal pilihan".
- Kartu paket diurutkan berdasarkan kelas, lalu mapel. Tiap kartu: judul, "Kelas 5 SD · Matematika · 8 soal", tombol "Ubah" dan "Hapus". Hapus meminta konfirmasi di dalam kartu: "**Hapus "{judul}"?** Soal ini tidak akan muncul lagi untuk anak."
- Kalau kosong: "Belum ada soal pilihan. Tekan "Tambah soal pilihan" untuk membuat yang pertama."
- Tautan "Ganti PIN admin".

**Editor**
- Judul paket (placeholder "contoh: Latihan UTS Pecahan")
- Dua kolom: "Untuk jenjang" (SD/SMP/SMA) dan "Kelas" (opsi menyesuaikan jenjang, misalnya "Kelas 7 (kelas 1 SMP)")
- Mata pelajaran (menyesuaikan jenjang)
- Textarea "Soal" (tinggi minimal 200px) dengan placeholder:
  ```
  Ketik atau tempel soal di sini. Tidak harus rapi. Contoh:

  1. Hasil dari 3/4 + 1/4 adalah...
  A. 1/2
  B. 1
  C. 4/8
  D. 2
  Kunci: B

  2. Ibu punya 12 kue, lalu dibagi rata ke 4 anak. Tiap anak dapat berapa kue?
  ```
- Catatan: "AI akan memecah teks jadi soal, pilihan, dan kunci jawaban. Kalau pilihan atau kunci belum ada, AI melengkapinya dan memberi tanda supaya bisa Anda cek."
- Tombol "Rapikan soal" (saat proses: "Merapikan soal…", nonaktif)
- **Kartu "Cek dulu sebelum simpan"** dengan jumlah soal. Catatan: "Ketuk pilihan untuk menjadikannya kunci jawaban."
  - Tiap soal: nomor dan teks, lalu pilihan sebagai tombol (kunci ditandai hijau dan tebal, `aria-pressed`).
  - Kalau `keyGuessed`: kartu diberi border 2px aksen dan label "Kunci dipilih AI. Mohon dicek." Label hilang setelah admin mengetuk sebuah pilihan.
  - Kalau `optionsAdded`: catatan "Sebagian pilihan jawaban ditambahkan AI."
  - Penjelasan (kecil, abu-abu) dan tautan merah "Hapus soal ini".
- Tombol "Simpan soal pilihan" dan "Batal".
- Validasi simpan: harus sudah dirapikan ("Tekan "Rapikan soal" dulu supaya soalnya bisa dicek sebelum disimpan."). Kalau teks diubah setelah dirapikan: "Teks soal berubah setelah dirapikan. Tekan "Rapikan soal" lagi supaya hasilnya ikut diperbarui."
- Toast setelah simpan: "Tersimpan. Muncul untuk {Kelas k Jenjang} di pelajaran {mapel}."
- **Cadangan tanpa AI:** pembaca format sederhana. Baris `1.` / `1)` memulai soal, `A.` / `a)` adalah pilihan (maks 4), dan `Kunci: B` / `Jawaban: B` adalah kunci. Baris lain menyambung ke soal atau pilihan terakhir. Error per soal: "Soal nomor {n} belum punya pilihan A, B, dan seterusnya." / "Soal nomor {n} belum punya baris "Kunci: ..."."

---

## 8. Sistem desain

### 8.1 Prinsip
- Mobile-first, satu kolom dengan lebar maksimal 560px di tengah.
- Gutter samping minimal 16px: `padding-left: max(16px, env(safe-area-inset-left))` (kanan sama). Padding atas dan bawah memperhitungkan safe area.
- Halaman tidak boleh pernah bergulir ke samping. Teks panjang memakai `overflow-wrap: anywhere`.
- Semua warna dan gaya komponen diambil dari **token CSS**. Tema dunia hanya mengganti nilai token di `body.t-{dunia}`, bukan menulis ulang aturan komponen. Ini mencegah bug "penanda terpilih tertimpa tema" yang sempat terjadi di prototipe.
- Target sentuh minimal 44px. Tombol utama 50px.
- Angka yang berjajar memakai `font-variant-numeric: tabular-nums`.

### 8.2 Font (Google Fonts)
| Peran | Font | Dipakai di |
|---|---|---|
| Teks isi | Nunito 400/600/700/800 | semua teks isi, semua tema |
| Display tema dasar | Nunito | layar netral |
| Dunia Blok | Pixelify Sans 500/700 | judul, tombol, angka |
| Arena Pahlawan | Chakra Petch 500/700 | judul (kapital, spasi huruf .05em) |
| Misi Antariksa | Orbitron 600/800 | judul (spasi huruf .03em) |
| Lembah Dino | Lilita One 400 | judul |

Skala: h1 1,7rem, h2 1,25rem, h3 1,05rem, isi 16px dengan line-height 1,5, eyebrow .75rem kapital tebal dengan spasi huruf .08em. Judul memakai `text-wrap: balance`.

### 8.3 Token
Semua token:

`--bg --fg --muted --card --line --soft --accent --accent-fg --good --bad --display --radius --radius-s --bw --card-shadow --btn-bg --btn-fg --btn-border --btn-radius --btn-shadow --field-bg --opt-bg --upper --track`

**Tema dasar (terang)**
| Token | Nilai |
|---|---|
| bg / fg / muted | `#f2f4f9` / `#1b2233` / `#5a6579` |
| card / line / soft | `#ffffff` / `#d3d9e6` / `#e6eaf3` |
| accent / accent-fg | `#e29a12` / `#2a1d05` |
| good / bad | `#24925a` / `#cf3e36` |
| radius / radius-s / bw | 18px / 12px / 1px |
| card-shadow | `0 1px 2px rgba(20,30,60,.06)` |
| btn | latar `#e29a12`, teks `#2a1d05`, radius 14px, bayangan `0 3px 0 #a86f06` |
| field-bg / opt-bg | `#f7f8fc` / `#ffffff` |

**Tema dasar (gelap):** mengikuti `prefers-color-scheme: dark` dan toggle `data-theme`.
bg `#12161e`, fg `#e9edf4`, muted `#9ba6b7`, card `#1b212c`, line `#2e3747`, soft `#232b38`, accent `#f2b53a`, accent-fg `#241904`, good `#4cc68a`, bad `#ff7a70`, btn latar `#f2b53a` dengan bayangan `0 3px 0 #9a6a10`, field-bg `#141922`, opt-bg `#1b212c`, `color-scheme: dark`.

**Dunia Blok** (`t-blok`, selalu terang)
| Token | Nilai |
|---|---|
| bg / fg / muted | `#bfe2f3` / `#2a2017` / `#6a5846` |
| card / line / soft | `#fff7e8` / `#6e4f33` / `#f3e3c6` |
| accent / accent-fg | `#e7a823` / `#2a2017` |
| good / bad | `#3c8f35` / `#c4412d` |
| radius / radius-s / bw | 0 / 0 / 3px |
| card-shadow | `4px 4px 0 #6e4f33` (bayangan keras gaya pixel) |
| btn | `#e7a823`, border 3px `#6e4f33`, radius 0, bayangan `3px 3px 0 #6e4f33` |
| field-bg / opt-bg | `#fffdf7` / `#fff7e8` |
| Khusus | progress bar kotak, isinya hijau; spinner berupa kotak yang melompat (`steps(4)`); canvas `image-rendering: pixelated` |

**Arena Pahlawan** (`t-pahlawan`, selalu gelap)
| Token | Nilai |
|---|---|
| bg / fg / muted | `#0e1120` / `#eef0ff` / `#9aa3c9` |
| card / line / soft | `#181d35` / `#34406f` / `#222a4a` |
| accent / accent-fg | `#f2b53a` / `#1a1306` |
| good / bad | `#35d39d` / `#ff5b6b` |
| radius / radius-s / bw | 6px / 4px / 1px |
| card-shadow | `0 0 0 1px rgba(242,181,58,.1), 0 10px 28px rgba(0,0,0,.4)` |
| btn | gradasi `#ffd06a` ke `#e6a01f`, teks `#1a1306`, radius 4px, cahaya `0 0 18px rgba(242,181,58,.35)` |
| field-bg / opt-bg | `#0b0e1b` / `#121731` |
| upper / track | uppercase / .05em |
| Latar body | radial `#2a2150` dari atas, memudar ke `#0e1120` |

**Misi Antariksa** (`t-antariksa`, selalu gelap)
| Token | Nilai |
|---|---|
| bg / fg / muted | `#0a0f2c` / `#eaf2ff` / `#a0b0d8` |
| card / line / soft | `#131a45` / `#2f3d85` / `#1c2560` |
| accent / accent-fg | `#5ee0ff` / `#06202a` |
| good / bad | `#4ce0a0` / `#ff6b8a` |
| radius / radius-s / bw | 18px / 14px / 1px |
| card-shadow | `0 0 0 1px rgba(94,224,255,.08), 0 12px 30px rgba(0,0,0,.45)` |
| btn | gradasi horizontal `#5ee0ff` ke `#8b7bff`, teks `#07122a`, radius pil (999px), cahaya `0 0 20px rgba(94,224,255,.35)` |
| field-bg / opt-bg | `#0a0f2a` / `#10173d` |
| Latar body | titik-titik bintang dari radial-gradient kecil, plus nebula ungu `rgba(110,70,200,.45)` di kanan atas |

**Lembah Dino** (`t-dino`, selalu terang)
| Token | Nilai |
|---|---|
| bg / fg / muted | `#eaeed2` / `#23301c` / `#5d6b4c` |
| card / line / soft | `#fffdf2` / `#8fa06a` / `#e0e7c0` |
| accent / accent-fg | `#e8832a` / `#ffffff` |
| good / bad | `#3f8f3a` / `#c4412d` |
| radius / radius-s / bw | 20px / 14px / 2px |
| card-shadow | `0 4px 0 #cdd4a8` |
| btn | `#e8832a`, teks putih, radius 16px, bayangan `0 5px 0 #a8561a` |
| field-bg / opt-bg | `#fffef8` / `#fffdf2` |
| Latar body | gradasi `#d9e8b8` ke `#eaeed2` di 320px pertama |

Atur juga warna `html` sesuai tema supaya area overscroll tidak belang.

### 8.4 Komponen
- **Kartu:** latar `--card`, border `--bw` `--line`, radius `--radius`, bayangan `--card-shadow`, padding 16px, gap 12px.
- **Tombol utama:** token btn, font display, tebal 800, ikut `--upper`/`--track`. Saat ditekan turun 2px. Nonaktif: opacity .55.
- **Tombol ghost:** latar kartu, border `--line`, tanpa bayangan. Varian kecil: tinggi minimal 40px.
- **Input dan select:** tinggi minimal 48px, latar `--field-bg`, border `--bw` `--line`, radius `--radius-s`.
- **Segmen (radio):** input disembunyikan, label menjadi tombol. Terpilih: latar aksen, teks `--accent-fg`, prefix "✓ ", cincin aksen 35%. Fokus: outline 3px aksen.
- **Pilihan jawaban:** latar `--opt-bg`, status `.right` atau `.wrong` memakai `color-mix` dengan kartu.
- **Chip:** pil dengan border 2px. Varian `up` hijau, `weak` merah.
- **Toast:** tetap di bawah tengah (plus safe area), latar `--fg`, teks `--bg`, hilang setelah 3,2 detik.
- **Pipo (maskot):** kotak 48px radius 14px berwarna aksen, dua mata gelap 9×11px yang berkedip setiap 4 detik, antena dengan bola merah `#ff6b5a`, bayangan dalam di bawah. Versi kecil 30px untuk avatar chat. Bangun dengan CSS atau SVG orisinal.
- **Tile dunia:** gambar CSS orisinal (lihat prototipe), tinggi 84px di kartu dunia dan 64×56 di kartu pemain.
  - Blok: langit, tanah pixel, tiga blok, matahari
  - Pahlawan: gradasi ungu malam, cahaya merah, belah ketupat emas
  - Antariksa: bintang, nebula ungu, planet bercincin
  - Dino: langit, matahari, rumput, tanah, tulang fosil SVG

### 8.5 Gerak
| Nama | Pemakaian | Detail |
|---|---|---|
| bob | hiasan pembuka, karakter | naik-turun 8px, 2,4–4s |
| twinkle | bintang | opacity 1 ke .25, 2,4s |
| glow | lambang emas | bayangan 14px ke 34px, 2,6s |
| rise | panel pembuka | translateY 18px dan skala .97 ke normal, 0,6s |
| pulse | tombol Ayo Mulai | skala 1 ke 1,05, 1,8s |
| pop | gelembung chat, teks hadiah | skala .85, 1,04, lalu 1 |
| shake | HUD Pahlawan saat serangan kena | geser kiri-kanan 6px, .35s |
| blink | mata Pipo | setiap 4 detik |
| dot | indikator mengetik | opacity, 1s, berurutan |

Semua animasi dimatikan saat `prefers-reduced-motion: reduce`. Konten tidak boleh mulai dari opacity 0.

### 8.6 Empat dunia: aturan hadiah dan teks

> Semua desain dunia **orisinal**. Jangan memakai karakter, logo, nama, atau aset Minecraft, Mobile Legends, atau merek lain.

Untuk perhitungan hadiah, soal pilihan dihitung setara **sedang**.

**Dunia Blok**
- Deskripsi singkat: "Kumpulkan blok, bangun kastilmu."
- Teks hadiah: "Setiap jawaban benar memberi blok kayu, batu, atau permata. Kumpulkan untuk membangun kastilmu!"
- Hadiah per jawaban benar: mudah +1 kayu (`#9a6a3f`), sedang +1 batu (`#8d949b`), sulit +1 permata (`#3fc3c9`).
- Tingkatan bangunan berdasarkan total blok: 0 Tenda, 15 Pondok Kayu, 40 Rumah Batu, 80 Menara, 140 Kastil Permata.
- **Kartu markas:** canvas pixel 240×150 (sel 10px) berisi langit, matahari, awan, dan tanah berumput. Blok disusun dari bawah ke atas dan dari tengah ke luar, selebar 12 sel untuk 8 baris pertama lalu menyempit seperti menara. Di bawahnya: "Bangunanmu: {tingkat}", "{n} blok", progress bar, "{x} blok lagi untuk membangun {berikut}.", dan inventaris 3 kolom. Kalau masih kosong, canvas menampilkan "Jawab benar untuk dapat blok pertama!"
- **HUD:** "Hasil tambang misi ini" dengan +kayu, +batu, +permata.
- Kalimat benar: "Mantap, blok didapat!", "Tepat sekali!", "Keren, terus menambang!"
- Banner hasil: ≥80% "Misi berhasil!", ≥60% "Hampir sempurna!", lainnya "Terus menambang!"

**Arena Pahlawan**
- Deskripsi singkat: "Kalahkan boss, naikkan rank."
- Teks hadiah: "Setiap jawaban benar adalah serangan ke boss dan memberi XP. Kumpulkan XP untuk naik rank!"
- XP per jawaban benar: mudah 10, sedang 20, sulit 30. Boss kalah kalau jawaban benar ≥ `ceil(70% × jumlah soal)`, dengan bonus +15 XP.
- Rank: 0 Rekrut, 100 Ksatria, 300 Komandan, 600 Jenderal, 1000 Legenda Arena.
- **Kartu markas:** lambang belah ketupat berisi nomor rank, "Rank kamu", nama rank, progress bar emas, statistik (XP, boss dikalahkan, XP ke rank berikut).
- **HUD:** "Boss Materi" dengan bar HP merah (`#ff5b6b` ke `#e2475a`) dan sisa serangan, lalu "HP kamu" berupa 3 hati (♥/♡). Jawaban salah mengurangi 1 hati, tapi tidak menghentikan sesi. HUD bergetar saat serangan kena.
- Kalimat benar: "Critical hit!", "Serangan tepat sasaran!", "Mantap, pahlawan!"
- Banner: menang "Victory! Boss tumbang", kalah "Boss masih bertahan". Kalau naik rank: "Naik rank! Sekarang kamu {rank}."

**Misi Antariksa**
- Deskripsi singkat: "Isi bahan bakar, jelajahi tata surya."
- Teks hadiah: "Setiap jawaban benar mengisi bahan bakar roket. Terbanglah dari Bumi sampai Neptunus!"
- Bahan bakar per jawaban benar: mudah 10, sedang 20, sulit 30 liter.
- Tujuan (total liter, warna, fakta):

| Tujuan | Liter | Warna | Fakta |
|---|---|---|---|
| Bumi | 0 | `#3d7be0` | Rumah kita, titik awal peluncuran. |
| Bulan | 40 | `#cfcfcf` | Bulan adalah satu-satunya satelit alami Bumi. |
| Mars | 120 | `#d1603d` | Mars disebut planet merah karena tanahnya mengandung karat besi. |
| Jupiter | 260 | `#d9a066` | Jupiter adalah planet terbesar di tata surya. |
| Saturnus | 450 | `#e3c27a` (bercincin) | Cincin Saturnus terbuat dari bongkahan es dan batu. |
| Uranus | 700 | `#7fd6df` | Uranus berputar dalam posisi miring, seperti menggelinding. |
| Neptunus | 1000 | `#4b6fe0` | Neptunus adalah planet terjauh dari Matahari. |

- **Kartu markas:** canvas peta 320×150 berlatar `#070b22` dengan bintang acak tetap (seeded). Tujuan dipasang dari kiri ke kanan di jalur bergelombang (sinus). Jalur yang sudah ditempuh berupa garis cyan, sisanya putus-putus. Tujuan yang belum dicapai redup. Roket putih kecil dengan api oranye berada di antara tujuan sekarang dan berikutnya sesuai progres. Di bawahnya: "Sekarang di {tujuan}", "{f} liter", progress bar gradasi cyan-ungu, "{x} liter lagi untuk terbang ke {berikut}.", kotak fakta.
- **HUD:** "Menuju {berikut}" dengan progress bar, "+{x} liter misi ini", dan "{f}/{target} liter".
- Kalimat benar: "Mesin menyala!", "Tepat sasaran, Kapten!", "Roket melaju kencang!"
- Banner: ≥60% "Peluncuran sukses!", lainnya "Mesin perlu dicek lagi". Kalau tiba di tujuan baru: "Roketmu mendarat di {tujuan}!"

**Lembah Dino**
- Deskripsi singkat: "Gali fosil, susun kerangka dino."
- Teks hadiah: "Setiap jawaban benar memberi tulang fosil. Kumpulkan 8 tulang untuk menyusun satu kerangka dinosaurus!"
- Tulang per jawaban benar: mudah 1, sedang 2, sulit 3. Setiap 8 tulang menjadi 1 kerangka. Urutan dinosaurus berputar:

| Dinosaurus | Fakta |
|---|---|
| T-Rex | Pemakan daging raksasa yang hidup sekitar 68 juta tahun lalu. |
| Triceratops | Punya tiga tanduk di kepala dan perisai besar di lehernya. |
| Stegosaurus | Punya lempeng-lempeng tegak di sepanjang punggungnya. |
| Brachiosaurus | Lehernya sangat panjang, kira-kira setinggi gedung 4 lantai. |
| Velociraptor | Kecil, gesit, dan tubuhnya berbulu. |
| Ankylosaurus | Tubuhnya berlapis baja dan ujung ekornya seperti gada. |

- **Kartu markas:** "SEDANG DIGALI", nama dinosaurus, "{n}/8 tulang", 8 slot tulang dalam grid (kosong: border putus-putus dengan ikon redup; terisi: latar `#f4ead2`, border `#b89a63`, ikon `#8a6a3a`), kotak fakta, lalu "Museum kamu" berisi chip dinosaurus yang selesai ("T-Rex ×2" kalau berulang). Kalau kosong: "Belum ada kerangka. Kumpulkan 8 tulang untuk kerangka pertamamu!"
- Ikon tulang (SVG orisinal, viewBox 24×12): 4 lingkaran r=3 di (3,3), (3,9), (21,3), (21,9) ditambah persegi panjang x=3 y=3 lebar 18 tinggi 6.
- **HUD:** "Menggali {dino}", "+{x} tulang misi ini", 8 slot. Kalau kerangka selesai di tengah sesi: "{n} kerangka baru selesai!"
- Kalimat benar: "Fosil ditemukan!", "Galian yang bagus!", "Wah, tulang langka!"
- Banner: ≥60% "Ekspedisi sukses!", lainnya "Terus menggali!" Kalau kerangka selesai: "Kerangka {nama} selesai dan dipajang di museum!"

Di setiap kartu markas, sertakan satu baris kecil yang menjelaskan aturan hadiah (contoh: "Level mudah memberi kayu, sedang memberi batu, sulit memberi permata.").

---

## 9. Logika

### 9.1 Jenjang, kelas, fase, dan mapel
- Jenjang: kelas 1–6 SD, 7–9 SMP, 10–12 SMA.
- Label pendek: "Kelas 5 SD", "Kelas 7 SMP". Label panjang (untuk prompt): "kelas 5 SD", "kelas 7 (kelas 1 SMP)", "kelas 10 (kelas 1 SMA)".
- Fase Kurikulum Merdeka: kelas 1–2 A, 3–4 B, 5–6 C, 7–9 D, 10 E, 11–12 F.
- Usia perkiraan untuk prompt: kelas + 5 sampai kelas + 6 tahun.
- Mata pelajaran:
  - SD: Matematika, IPAS, Bahasa Indonesia, Bahasa Inggris, Pendidikan Pancasila, Lainnya
  - SMP: Matematika, IPA, IPS, Bahasa Indonesia, Bahasa Inggris, Pendidikan Pancasila, Informatika, Lainnya
  - SMA: Matematika, Fisika, Kimia, Biologi, Ekonomi, Sejarah, Geografi, Sosiologi, Bahasa Indonesia, Bahasa Inggris, Informatika, Lainnya

### 9.2 Saran latihan
Untuk setiap topik:
- **Siap naik:** level tertinggi dengan `best_pct ≥ 80` ada, dan level berikutnya belum pernah ≥80.
- **Latih lagi:** level dengan `last_pct < 60` dan `best_pct` belum pernah ≥80.
- Mengetuk chip mengisi mapel, topik (tanpa akhiran "(soal contoh)"), dan level, lalu menggulir ke form.

### 9.3 Tahun ajaran dan naik kelas
- `academicYear(tanggal)` = tahun itu kalau bulan ≥ Juli, selain itu tahun sebelumnya.
- Saat membuka markas, kalau `player.academic_year < academicYear(sekarang)`:
  - Kelas < 12: kartu "**Tahun ajaran baru sudah mulai!**" dengan teks "{nama}, kamu sudah naik kelas belum?" dan tombol "Sudah, sekarang {Kelas k+1 Jenjang}" (kelas +1, simpan tahun ajaran, toast "Selamat naik kelas, {nama}!") serta "Belum, masih {Kelas k Jenjang}" (simpan tahun ajaran saja).
  - Kelas 12: "Tahun ajaran baru sudah mulai! Kalau kelasmu berubah, ubah lewat Pengaturan di bawah." dengan tombol "Oke".
- Mengubah kelas lewat Pengaturan juga memperbarui `academic_year`.

### 9.4 Sesi soal
- Jumlah soal 5 atau 10. Soal pilihan memakai jumlah soal di paket. "Buat soal mirip" membuat `min(10, max(5, jumlah soal paket))` soal.
- Hadiah sementara dikumpulkan selama sesi, lalu disimpan sekaligus di akhir sesi bersama riwayat. Kalau sesi ditinggal di tengah, hadiah tidak dihitung (boleh diubah kalau ada usulan yang lebih baik).
- Riwayat disimpan per sesi. Tampilkan 8 terakhir di markas.
- Soal contoh tersedia per jenjang (lampiran A) untuk dipakai saat AI tidak tersedia atau untuk tur pertama.

---

## 10. Pembuatan soal oleh AI

Semua prompt dijalankan di server. Minta output **JSON saja**, lalu validasi dengan skema.

### 10.1 Prompt: soal baru dari topik
```
Kamu guru {kelasLong} di Indonesia yang mengajar dengan Kurikulum Merdeka (Fase {fase}).
Buat {n} soal pilihan ganda {"mata pelajaran " + mapel + " " kalau mapel bukan "Lainnya"}tentang "{topik}" untuk siswa {kelasLong}, tingkat kesulitan {level}.
Arti level: mudah = konsep dasar dan satu langkah; sedang = penerapan dua langkah atau soal cerita pendek; sulit = soal cerita atau analisis beberapa langkah, tetap sesuai materi {kelasLong}.
Aturan:
- Bahasa Indonesia yang jelas dan sesuai untuk usia {usia}-{usia+1} tahun.
- Tepat 4 pilihan, tepat satu yang benar, pengecoh masuk akal. Sebar posisi jawaban benar secara acak.
- Setiap soal berbeda, tidak mengulang ide yang sama.
- "explain": 1-3 kalimat yang mudah dipahami anak usia {usia} tahun. Jika ada hitungan, tunjukkan langkahnya. Nada ramah dan menyemangati. Jangan menyebut huruf pilihan (A/B/C/D).
- Hitung ulang dan periksa setiap kunci jawaban sebelum menulis.
- Jika materi tidak cocok untuk sekolah, buat soal tentang materi sekolah yang paling dekat.
Balas HANYA JSON array tanpa teks lain, dengan bentuk:
[{"q":"teks soal","options":["...","...","...","..."],"answer":0,"explain":"..."}]
"answer" adalah indeks (0-3) dari pilihan yang benar.
```

### 10.2 Prompt: soal mirip dari soal pilihan
```
Kamu guru {kelasLong} di Indonesia yang mengajar dengan Kurikulum Merdeka (Fase {fase}).
Orang tua sudah menyiapkan contoh soal {mapel}berjudul "{judul}" seperti di bawah ini.
Buat {n} soal pilihan ganda BARU yang materi, gaya, dan tingkat kesulitannya mirip dengan contoh, tetapi dengan angka, kalimat, atau situasi yang berbeda. Jangan menyalin soal contoh.
Aturan: (sama dengan 10.1: bahasa sesuai usia, 4 pilihan, explain, cek ulang kunci)
Contoh soal dari orang tua:
<<<
1. {soal}
A. … B. … C. … D. …
Kunci: {huruf}
… (maksimal 12 soal)
>>>
Balas HANYA JSON array … (format sama dengan 10.1)
```

### 10.3 Prompt: merapikan teks admin
```
Berikut teks soal yang diketik orang tua untuk anak {kelasLong}, mata pelajaran {mapel}. Ubah menjadi soal pilihan ganda yang terstruktur.
Aturan:
- Ambil semua soal yang ada di teks. Jangan menambah soal baru dan jangan membuang soal.
- Pertahankan kalimat soal dan pilihan sedekat mungkin dengan aslinya. Rapikan salah ketik ringan saja.
- Jika sebuah soal punya kurang dari 4 pilihan atau tidak punya pilihan sama sekali, lengkapi menjadi tepat 4 pilihan dengan pengecoh yang masuk akal, lalu isi "optionsAdded": true.
- Jika kunci jawaban ditulis di teks, pakai kunci itu. Jika tidak ditulis, tentukan jawaban yang benar, hitung ulang untuk memastikan, lalu isi "keyGuessed": true.
- "explain": 1-3 kalimat yang mudah dipahami anak usia {usia} tahun. Jika ada hitungan, tunjukkan langkahnya. Jangan menyebut huruf pilihan.
Balas HANYA JSON array tanpa teks lain:
[{"q":"…","options":["…","…","…","…"],"answer":0,"explain":"…","keyGuessed":false,"optionsAdded":false}]
Teks dari orang tua:
<<<
{teks, maksimal 20.000 karakter}
>>>
```

### 10.4 Validasi output
- Harus berupa array. Tiap item: `q` string tidak kosong, `options` array 4 string tidak kosong (untuk 10.3 boleh 2–4 kalau dari parser manual), `answer` integer dalam rentang, `explain` string.
- Buang item yang tidak valid. Untuk 10.1 dan 10.2, ambil maksimal `n`. Kalau soal valid kurang dari `min(3, n)`, anggap gagal.
- Sebaiknya acak urutan pilihan di server dan perbarui `answer`, supaya posisi kunci benar-benar tersebar.
- Teks dari pengguna (topik, teks admin) diperlakukan sebagai data, bukan instruksi. Bungkus dengan pembatas seperti di prompt.

### 10.5 Pesan error (untuk anak)
| Kondisi | Pesan |
|---|---|
| Batas harian habis | Jatah membuat soal hari ini sudah habis. Besok bisa lagi, ya! |
| Terlalu cepat / rate limit | Terlalu banyak permintaan barusan. Tunggu sebentar, lalu coba lagi. |
| AI menolak topik | Materi itu tidak bisa dibuatkan soal. Coba tulis materi pelajaran sekolah, misalnya "pecahan" atau "sistem pernapasan". |
| JSON rusak | Soalnya belum tersusun rapi. Tekan tombol buat soal sekali lagi. |
| Soal valid terlalu sedikit | Soalnya belum lengkap. Tekan tombol buat soal sekali lagi. |
| Sesi login habis | Sesi login sudah habis. Minta orang tua masuk lagi, lalu coba lagi. |
| Gangguan lain | Koneksi terputus saat membuat soal. Coba lagi. |

Pesan muncul di form markas. Membatalkan dari layar memuat kembali ke markas tanpa pesan.

---

## 11. Privasi, keamanan, dan anak

- Penggunanya anak di bawah umur. Kumpulkan data seminimal mungkin: nama panggilan dan kelas saja. Tidak ada nama lengkap, sekolah, foto, lokasi, atau kontak anak.
- Akun dibuat dan dikendalikan orang tua. Sediakan cara mengekspor dan menghapus semua data keluarga (sejalan dengan UU Pelindungan Data Pribadi).
- Sebelum rilis publik, periksa kebijakan penggunaan Anthropic untuk aplikasi yang dipakai anak di bawah umur, lalu terapkan langkah pengamannya.
- Tidak ada fitur chat bebas dengan AI di sisi anak. AI hanya membuat soal dan penjelasan.
- Kunci API dan semua panggilan AI hanya di server. Terapkan rate limit dan batas biaya.
- PIN admin di-hash dengan salt di server, dengan batas percobaan.
- Row Level Security di semua tabel.

---

## 12. Aksesibilitas

- Kontras teks memenuhi WCAG AA di setiap tema.
- Semua kontrol bisa dipakai dengan keyboard, dengan fokus yang terlihat (outline 3px aksen, offset 2px).
- Hiasan diberi `aria-hidden`. Canvas diberi `role="img"` dan `aria-label` yang menjelaskan keadaannya (misalnya "Bangunanmu: Pondok Kayu").
- Area chat perkenalan memakai `aria-live="polite"`. Indikator mengetik diberi label "Pipo sedang mengetik".
- Segmen level memakai `role="radiogroup"` dengan label.
- Hormati `prefers-reduced-motion`.
- Status benar/salah tidak hanya ditunjukkan dengan warna, tapi juga dengan judul umpan balik dan teks kunci jawaban.

---

## 13. Keputusan yang masih terbuka

Tanyakan ke pemilik produk (Diego) sebelum membangun bagian terkait:

1. **Model akun:** satu akun orang tua dengan profil anak (rekomendasi), atau anak punya login sendiri? Bagaimana cara orang tua "mengunci" HP anak ke satu profil?
2. **Penyedia auth dan database:** Supabase atau yang lain?
3. **Kunci jawaban di browser:** periksa jawaban di server (lebih aman) atau di browser (lebih sederhana dan cepat)?
4. **Batas harian AI:** berapa paket per anak per hari dan per akun?
5. **Model AI** dan anggaran biaya bulanan.
6. **Hadiah saat sesi ditinggal di tengah:** hangus (default prototipe) atau dihitung sebagian?
7. **Admin:** cukup PIN, atau wajib konfirmasi login orang tua?
8. **Domain dan nama rilis.**

---

## 14. Urutan pengerjaan

1. Setup proyek, sistem token dan 5 tema, font, komponen dasar. Buat halaman katalog komponen untuk dicek.
2. Halaman pembuka.
3. Auth orang tua, tabel, RLS, dan daftar pemain.
4. Perkenalan dengan Pipo.
5. Markas dengan 4 kartu hadiah (data dummy dulu), Pengaturan, dan logika naik kelas.
6. Endpoint AI untuk soal baru: validasi, batas harian, pencatatan biaya.
7. Layar memuat, mengerjakan soal (dengan HUD per dunia), hasil, penyimpanan hadiah, riwayat, dan saran.
8. Mode admin: PIN, daftar, editor, endpoint merapikan, parser manual.
9. Soal pilihan di sisi anak dan endpoint soal mirip.
10. Aksesibilitas, reduced motion, cek tampilan di lebar 360–430px, terang dan gelap.
11. Pengujian sesuai bagian 15, lalu deploy.

---

## 15. Kriteria penerimaan

- [ ] Halaman pembuka tampil lengkap tanpa perlu menggulir di HP 390×844. Tombol "Ayo Mulai!" berdenyut, dan denyutnya berhenti saat reduced motion.
- [ ] Pemain baru melewati 4 langkah perkenalan. Pipo menyapa dengan nama panggilan anak.
- [ ] HP yang sama langsung masuk ke markas anak yang terakhir dipakai.
- [ ] Keempat dunia tampil dengan token, font, kartu hadiah, HUD, kalimat, dan banner masing-masing.
- [ ] Tombol level, jumlah soal, dan soal pilihan selalu menunjukkan status terpilih dengan jelas di setiap tema.
- [ ] Daftar mapel dan placeholder materi sesuai jenjang anak.
- [ ] Soal dari AI selalu 4 pilihan dan lolos validasi. Penjelasan memakai bahasa sesuai usia.
- [ ] Kunci jawaban dan penjelasan baru muncul setelah anak menjawab.
- [ ] Hadiah dihitung sesuai tabel di 8.6, termasuk aturan boss, tujuan antariksa, dan kerangka dinosaurus.
- [ ] Saran "Siap naik" muncul setelah skor ≥80%, dan "Latih lagi" setelah skor <60%.
- [ ] Kartu naik kelas muncul sekali per tahun ajaran baru dan menaikkan kelas dengan benar (termasuk perpindahan SD ke SMP dan SMP ke SMA).
- [ ] Ganti dunia tidak menghapus hadiah dunia lama.
- [ ] Hapus pemain meminta konfirmasi dan menghapus semua datanya.
- [ ] Mode admin hanya bisa dibuka dengan PIN. Teks bebas bisa dirapikan oleh AI, kunci yang ditebak AI ditandai, kunci bisa diganti dengan mengetuk, dan soal bisa dihapus sebelum disimpan.
- [ ] Parser manual bekerja tanpa AI dan menampilkan error per nomor soal.
- [ ] "★ Soal pilihan" hanya muncul untuk kelas yang tepat. Daftar paket mengikuti mapel yang dipilih. "Kerjakan" dan "Buat soal mirip (AI)" berfungsi.
- [ ] Batas harian AI bekerja dan menampilkan pesan yang ramah.
- [ ] Kunci API tidak pernah muncul di bundle browser maupun di network tab.
- [ ] Tidak ada scroll horizontal di lebar 360px. Semua target sentuh minimal 44px.
- [ ] Kontras AA di kelima tema.

---

## Lampiran A. Soal contoh (offline)

**SD · Matematika · Pecahan**
1. Pecahan yang senilai dengan 1/2 adalah… [2/3, **3/6**, 2/5, 1/4]. Kalikan pembilang dan penyebut 1/2 dengan angka yang sama. 1×3 = 3 dan 2×3 = 6, jadi 1/2 = 3/6.
2. Hasil dari 1/4 + 2/4 adalah… [3/8, **3/4**, 2/4, 1/2]. Penyebutnya sudah sama (4), jadi cukup jumlahkan pembilangnya: 1 + 2 = 3. Hasilnya 3/4.
3. Ibu memotong kue menjadi 8 bagian sama besar. Adi makan 3 bagian. Pecahan kue yang dimakan Adi adalah… [3/5, 5/8, **3/8**, 8/3]. Kue punya 8 bagian (penyebut) dan Adi makan 3 bagian (pembilang). Jadi pecahannya 3/8.
4. Bentuk desimal dari 3/10 adalah… [0,03, 3,0, **0,3**, 0,13]. Per sepuluh berarti satu angka di belakang koma. 3/10 = 0,3.
5. Pecahan terbesar di antara pilihan berikut adalah… [1/5, **1/3**, 1/8, 1/6]. Kalau pembilangnya sama-sama 1, penyebut yang paling kecil berarti potongannya paling besar. Jadi 1/3 yang terbesar.

**SMP · Matematika · Bilangan bulat**
1. Hasil dari −7 + 12 adalah… [−19, −5, **5**, 19]. Mulai dari −7 di garis bilangan, lalu maju 12 langkah ke kanan. Kamu berhenti di 5.
2. Hasil dari (−4) × (−6) adalah… [−24, −10, 10, **24**]. Negatif dikali negatif hasilnya positif. 4 × 6 = 24.
3. Suhu di puncak gunung −3°C. Siang hari suhunya naik 8°C. Suhu siang hari adalah… [**5°C**, −11°C, 11°C, −5°C]. Naik berarti ditambah: −3 + 8 = 5.
4. Urutan bilangan dari yang terkecil adalah… [−2, −5, 0, 3 | **−5, −2, 0, 3** | 0, −2, −5, 3 | 3, 0, −2, −5]. Makin jauh ke kiri di garis bilangan, makin kecil.
5. Hasil dari 20 : (−5) adalah… [4, **−4**, −15, 25]. Positif dibagi negatif hasilnya negatif. 20 : 5 = 4, jadi hasilnya −4.

**SMA · Fisika · Gerak dan gaya**
1. Sebuah mobil menempuh 120 km dalam 2 jam. Kecepatan rata-ratanya adalah… [40 km/jam, **60 km/jam**, 80 km/jam, 240 km/jam]. Kecepatan rata-rata = jarak : waktu = 120 km : 2 jam = 60 km/jam.
2. Satuan gaya dalam Sistem Internasional (SI) adalah… [Joule, Watt, **Newton**, Pascal]. Gaya diukur dalam newton (N). Joule untuk energi, watt untuk daya, dan pascal untuk tekanan.
3. Benda bermassa 2 kg diberi gaya 10 N. Percepatan benda adalah… [**5 m/s²**, 20 m/s², 12 m/s², 0,2 m/s²]. Pakai hukum II Newton: a = F : m = 10 N : 2 kg = 5 m/s².
4. Benda bergerak dengan kecepatan tetap 5 m/s selama 4 detik. Jarak yang ditempuh adalah… [1,25 m, 9 m, **20 m**, 25 m]. Jarak = kecepatan × waktu = 5 m/s × 4 s = 20 m.
5. Saat bus tiba-tiba direm, penumpang terdorong ke depan. Peristiwa ini sesuai dengan… [**Hukum I Newton (kelembaman)**, Hukum II Newton, Hukum III Newton, Hukum Archimedes]. Tubuh penumpang ingin tetap bergerak maju saat bus berhenti. Ini disebut kelembaman.

Judul soal contoh diberi akhiran "(soal contoh)", misalnya "Pecahan (soal contoh)". Akhiran ini dibuang saat topik dipakai untuk mengisi form.

## Lampiran B. Roadmap setelah rilis
1. Upload foto buku/LKS sebagai sumber soal (dengan model vision).
2. Mode Simulasi Ulangan dengan timer, termasuk aturan untuk soal yang belum terjawab saat waktu habis.
3. Pilihan topik dari Capaian Pembelajaran resmi per fase dan mapel.
4. Tombol "Lapor soal salah", yang hasilnya masuk ke mode admin.
5. Dashboard progres untuk orang tua (per anak, per mapel, topik lemah).
6. Lencana pencapaian dan streak harian.
7. Mapel pilihan atau jurusan untuk SMA kelas 11–12.
8. Dua dunia tambahan yang sudah diusulkan: Samudra Dalam (koleksi hewan laut) dan Sirkuit Balap (upgrade mobil).
