"use client";

import { GAMBAR_SISI_MAKS, GAMBAR_TARGET_BYTE, type Kotak } from "./gambarSoal";
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

/* ---------- Potongan gambar soal (STATUS "BERIKUTNYA" no. 3) ---------- */

const muatUrl = (url: string) =>
  new Promise<HTMLImageElement>((ok, gagal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => gagal(new Error("Foto tidak bisa dibuka."));
    img.src = url;
  });

/**
 * Potong bagian foto (kotak dalam pecahan 0–1) menjadi JPEG kecil (sisi ≤ 900 px, ±≤ 180 KB).
 * Dipotong di HP dari foto yang masih ada di memori; foto utuh tidak pernah dikirim untuk disimpan.
 */
export async function potongGambar(urlFoto: string, k: Kotak): Promise<string> {
  const img = await muatUrl(urlFoto);
  const sx = k.x1 * img.naturalWidth;
  const sy = k.y1 * img.naturalHeight;
  const sw = Math.max(1, (k.x2 - k.x1) * img.naturalWidth);
  const sh = Math.max(1, (k.y2 - k.y1) * img.naturalHeight);
  for (const sisi of [GAMBAR_SISI_MAKS, 700, 520]) {
    const skala = Math.min(1, sisi / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * skala));
    c.height = Math.max(1, Math.round(sh * skala));
    const g = c.getContext("2d");
    if (!g) throw new Error("Gambar tidak bisa diproses.");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    for (const mutu of [0.85, 0.75, 0.62]) {
      const data = c.toDataURL("image/jpeg", mutu).split(",")[1] ?? "";
      if (data.length * 0.75 <= GAMBAR_TARGET_BYTE) return data;
    }
  }
  throw new Error("Potongan gambar terlalu besar. Perkecil kotaknya.");
}
