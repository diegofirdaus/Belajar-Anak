"use client";

import { FOTO_BASE64_MAKS, FOTO_TOTAL_MAKS } from "./soalPilihan";

/** Sisi terpanjang yang disarankan untuk dibaca Claude, dan cadangan kalau total masih terlalu besar. */
const UKURAN = [
  { sisi: 1568, mutu: 0.82 },
  { sisi: 1280, mutu: 0.72 },
  { sisi: 1024, mutu: 0.65 },
];

function muatGambar(file: File): Promise<HTMLImageElement> {
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      gagal(new Error("Foto tidak bisa dibuka."));
    };
    img.src = url;
  });
}

function jadikanJpeg(img: HTMLImageElement, sisi: number, mutu: number): string {
  const skala = Math.min(1, sisi / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * skala));
  c.height = Math.max(1, Math.round(img.naturalHeight * skala));
  const g = c.getContext("2d");
  if (!g) throw new Error("Foto tidak bisa diproses.");
  g.fillStyle = "#ffffff"; // PNG transparan jadi putih, bukan hitam
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", mutu).split(",")[1] ?? "";
}

/**
 * Memperkecil foto di HP sebelum dikirim (JPEG, sisi terpanjang ≤ 1568 px). Orientasi foto kamera
 * sudah diterapkan browser saat menggambar. Kalau total masih terlalu besar, diperkecil lagi.
 */
export async function siapkanFoto(files: File[]): Promise<{ media_type: "image/jpeg"; data: string }[]> {
  const gambar = await Promise.all(files.map(muatGambar));
  for (const u of UKURAN) {
    const data = gambar.map((g) => jadikanJpeg(g, u.sisi, u.mutu));
    const total = data.reduce((a, d) => a + d.length, 0);
    if (total <= FOTO_TOTAL_MAKS && data.every((d) => d.length <= FOTO_BASE64_MAKS)) {
      return data.map((d) => ({ media_type: "image/jpeg" as const, data: d }));
    }
  }
  throw new Error("Foto terlalu besar. Coba kirim lebih sedikit foto sekaligus.");
}
