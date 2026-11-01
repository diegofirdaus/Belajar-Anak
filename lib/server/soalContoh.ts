import "server-only";

import type { Jenjang } from "@/lib/kelas";
import { AKHIRAN_CONTOH } from "@/lib/latihan";
import type { Soal } from "@/lib/soal";

/** Soal contoh offline per jenjang (brief lampiran A). Dipakai saat AI tidak tersedia. Hanya di server: berisi kunci. */
export const SOAL_CONTOH: Record<Jenjang, { mapel: string; topik: string; soal: Soal[] }> = {
  SD: {
    mapel: "Matematika",
    topik: "Pecahan" + AKHIRAN_CONTOH,
    soal: [
      {
        q: "Pecahan yang senilai dengan 1/2 adalah…",
        options: ["2/3", "3/6", "2/5", "1/4"],
        answer: 1,
        explain: "Kalikan pembilang dan penyebut 1/2 dengan angka yang sama. 1×3 = 3 dan 2×3 = 6, jadi 1/2 = 3/6.",
      },
      {
        q: "Hasil dari 1/4 + 2/4 adalah…",
        options: ["3/8", "3/4", "2/4", "1/2"],
        answer: 1,
        explain: "Penyebutnya sudah sama (4), jadi cukup jumlahkan pembilangnya: 1 + 2 = 3. Hasilnya 3/4.",
      },
      {
        q: "Ibu memotong kue menjadi 8 bagian sama besar. Adi makan 3 bagian. Pecahan kue yang dimakan Adi adalah…",
        options: ["3/5", "5/8", "3/8", "8/3"],
        answer: 2,
        explain: "Kue punya 8 bagian (penyebut) dan Adi makan 3 bagian (pembilang). Jadi pecahannya 3/8.",
      },
      {
        q: "Bentuk desimal dari 3/10 adalah…",
        options: ["0,03", "3,0", "0,3", "0,13"],
        answer: 2,
        explain: "Per sepuluh berarti satu angka di belakang koma. 3/10 = 0,3.",
      },
      {
        q: "Pecahan terbesar di antara pilihan berikut adalah…",
        options: ["1/5", "1/3", "1/8", "1/6"],
        answer: 1,
        explain: "Kalau pembilangnya sama-sama 1, penyebut yang paling kecil berarti potongannya paling besar. Jadi 1/3 yang terbesar.",
      },
    ],
  },
  SMP: {
    mapel: "Matematika",
    topik: "Bilangan bulat" + AKHIRAN_CONTOH,
    soal: [
      {
        q: "Hasil dari −7 + 12 adalah…",
        options: ["−19", "−5", "5", "19"],
        answer: 2,
        explain: "Mulai dari −7 di garis bilangan, lalu maju 12 langkah ke kanan. Kamu berhenti di 5.",
      },
      {
        q: "Hasil dari (−4) × (−6) adalah…",
        options: ["−24", "−10", "10", "24"],
        answer: 3,
        explain: "Negatif dikali negatif hasilnya positif. 4 × 6 = 24.",
      },
      {
        q: "Suhu di puncak gunung −3°C. Siang hari suhunya naik 8°C. Suhu siang hari adalah…",
        options: ["5°C", "−11°C", "11°C", "−5°C"],
        answer: 0,
        explain: "Naik berarti ditambah: −3 + 8 = 5.",
      },
      {
        q: "Urutan bilangan dari yang terkecil adalah…",
        options: ["−2, −5, 0, 3", "−5, −2, 0, 3", "0, −2, −5, 3", "3, 0, −2, −5"],
        answer: 1,
        explain: "Makin jauh ke kiri di garis bilangan, makin kecil.",
      },
      {
        q: "Hasil dari 20 : (−5) adalah…",
        options: ["4", "−4", "−15", "25"],
        answer: 1,
        explain: "Positif dibagi negatif hasilnya negatif. 20 : 5 = 4, jadi hasilnya −4.",
      },
    ],
  },
  SMA: {
    mapel: "Fisika",
    topik: "Gerak dan gaya" + AKHIRAN_CONTOH,
    soal: [
      {
        q: "Sebuah mobil menempuh 120 km dalam 2 jam. Kecepatan rata-ratanya adalah…",
        options: ["40 km/jam", "60 km/jam", "80 km/jam", "240 km/jam"],
        answer: 1,
        explain: "Kecepatan rata-rata = jarak : waktu = 120 km : 2 jam = 60 km/jam.",
      },
      {
        q: "Satuan gaya dalam Sistem Internasional (SI) adalah…",
        options: ["Joule", "Watt", "Newton", "Pascal"],
        answer: 2,
        explain: "Gaya diukur dalam newton (N). Joule untuk energi, watt untuk daya, dan pascal untuk tekanan.",
      },
      {
        q: "Benda bermassa 2 kg diberi gaya 10 N. Percepatan benda adalah…",
        options: ["5 m/s²", "20 m/s²", "12 m/s²", "0,2 m/s²"],
        answer: 0,
        explain: "Pakai hukum II Newton: a = F : m = 10 N : 2 kg = 5 m/s².",
      },
      {
        q: "Benda bergerak dengan kecepatan tetap 5 m/s selama 4 detik. Jarak yang ditempuh adalah…",
        options: ["1,25 m", "9 m", "20 m", "25 m"],
        answer: 2,
        explain: "Jarak = kecepatan × waktu = 5 m/s × 4 s = 20 m.",
      },
      {
        q: "Saat bus tiba-tiba direm, penumpang terdorong ke depan. Peristiwa ini sesuai dengan…",
        options: ["Hukum I Newton (kelembaman)", "Hukum II Newton", "Hukum III Newton", "Hukum Archimedes"],
        answer: 0,
        explain: "Tubuh penumpang ingin tetap bergerak maju saat bus berhenti. Ini disebut kelembaman.",
      },
    ],
  },
};
