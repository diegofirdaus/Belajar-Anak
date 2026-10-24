export type Jenjang = "SD" | "SMP" | "SMA";
export type Level = "mudah" | "sedang" | "sulit";

export const LEVELS: Level[] = ["mudah", "sedang", "sulit"];

export const JENJANG_INFO: Record<Jenjang, { full: string; kelas: number[] }> = {
  SD: { full: "Sekolah Dasar", kelas: [1, 2, 3, 4, 5, 6] },
  SMP: { full: "Sekolah Menengah Pertama", kelas: [7, 8, 9] },
  SMA: { full: "Sekolah Menengah Atas", kelas: [10, 11, 12] },
};

export const MAPEL: Record<Jenjang, string[]> = {
  SD: ["Matematika", "IPAS", "Bahasa Indonesia", "Bahasa Inggris", "Pendidikan Pancasila", "Lainnya"],
  SMP: [
    "Matematika", "IPA", "IPS", "Bahasa Indonesia", "Bahasa Inggris",
    "Pendidikan Pancasila", "Informatika", "Lainnya",
  ],
  SMA: [
    "Matematika", "Fisika", "Kimia", "Biologi", "Ekonomi", "Sejarah", "Geografi",
    "Sosiologi", "Bahasa Indonesia", "Bahasa Inggris", "Informatika", "Lainnya",
  ],
};

export const TOPIC_PLACEHOLDER: Record<Jenjang, string> = {
  SD: "contoh: pecahan senilai",
  SMP: "contoh: bilangan bulat negatif",
  SMA: "contoh: hukum Newton",
};

export function jenjangOf(kelas: number): Jenjang {
  if (kelas <= 6) return "SD";
  if (kelas <= 9) return "SMP";
  return "SMA";
}

/** "Kelas 5 SD", "Kelas 7 SMP" */
export function kelasShort(kelas: number): string {
  return `Kelas ${kelas} ${jenjangOf(kelas)}`;
}

/** Urutan kelas di dalam jenjangnya: kelas 7 → 1 (kelas 1 SMP). */
export function kelasInJenjang(kelas: number): number {
  const j = jenjangOf(kelas);
  return kelas - JENJANG_INFO[j].kelas[0] + 1;
}

/** Untuk prompt: "kelas 5 SD", "kelas 7 (kelas 1 SMP)". */
export function kelasLong(kelas: number): string {
  const j = jenjangOf(kelas);
  if (j === "SD") return `kelas ${kelas} SD`;
  return `kelas ${kelas} (kelas ${kelasInJenjang(kelas)} ${j})`;
}

export function fase(kelas: number): "A" | "B" | "C" | "D" | "E" | "F" {
  if (kelas <= 2) return "A";
  if (kelas <= 4) return "B";
  if (kelas <= 6) return "C";
  if (kelas <= 9) return "D";
  if (kelas === 10) return "E";
  return "F";
}

/** Usia perkiraan (batas bawah) untuk prompt. */
export function usia(kelas: number): number {
  return kelas + 5;
}

/** Tahun ajaran dimulai Juli. */
export function academicYear(d: Date = new Date()): number {
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

export function nextLevel(level: Level): Level | null {
  const i = LEVELS.indexOf(level);
  return i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}
