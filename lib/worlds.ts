export const WORLD_IDS = ["blok", "pahlawan", "antariksa", "dino"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export type World = {
  id: WorldId;
  name: string;
  short: string;
  rewardText: string;
  formTitle: string;
  startLabel: string;
  loadingTexts: [string, string, string];
};

export const WORLDS: Record<WorldId, World> = {
  blok: {
    id: "blok",
    name: "Dunia Blok",
    short: "Kumpulkan blok, bangun kastilmu.",
    rewardText:
      "Setiap jawaban benar memberi blok kayu, batu, atau permata. Kumpulkan untuk membangun kastilmu!",
    formTitle: "Ambil misi baru",
    startLabel: "Mulai menambang soal",
    loadingTexts: ["Menambang soal…", "Menggali bahan materi…", "Menyusun blok-blok soal…"],
  },
  pahlawan: {
    id: "pahlawan",
    name: "Arena Pahlawan",
    short: "Kalahkan boss, naikkan rank.",
    rewardText:
      "Setiap jawaban benar adalah serangan ke boss dan memberi XP. Kumpulkan XP untuk naik rank!",
    formTitle: "Pilih pertarungan",
    startLabel: "Masuk arena",
    loadingTexts: ["Memanggil boss materi…", "Menyiapkan arena…", "Mengasah senjata…"],
  },
  antariksa: {
    id: "antariksa",
    name: "Misi Antariksa",
    short: "Isi bahan bakar, jelajahi tata surya.",
    rewardText:
      "Setiap jawaban benar mengisi bahan bakar roket. Terbanglah dari Bumi sampai Neptunus!",
    formTitle: "Siapkan peluncuran",
    startLabel: "Luncurkan misi",
    loadingTexts: ["Mengisi bahan bakar…", "Menghitung mundur…", "Menyalakan mesin roket…"],
  },
  dino: {
    id: "dino",
    name: "Lembah Dino",
    short: "Gali fosil, susun kerangka dino.",
    rewardText:
      "Setiap jawaban benar memberi tulang fosil. Kumpulkan 8 tulang untuk menyusun satu kerangka dinosaurus!",
    formTitle: "Ekspedisi baru",
    startLabel: "Mulai menggali",
    loadingTexts: ["Menyiapkan sekop…", "Menggali tanah purba…", "Membersihkan fosil…"],
  },
};

export function isWorldId(v: unknown): v is WorldId {
  return typeof v === "string" && (WORLD_IDS as readonly string[]).includes(v);
}
