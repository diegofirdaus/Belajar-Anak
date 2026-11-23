"use client";

// Menggambar halaman PDF di HP (pdf.js) supaya gambar soal bisa dipotong dari PDF, sama seperti dari foto.
// Dimuat hanya saat PDF diunggah; PDF tetap tidak disimpan di mana pun.

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let muatan: Promise<PdfJs> | null = null;

function muatPdfJs(): Promise<PdfJs> {
  muatan ??= import("pdfjs-dist/legacy/build/pdf.mjs")
    .then((m) => {
      if (!m.GlobalWorkerOptions.workerPort) {
        m.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
      }
      return m;
    })
    .catch((e) => {
      muatan = null;
      throw e;
    });
  return muatan;
}

/** Sisi terpanjang gambar halaman (sama dengan foto yang dikirim ke AI). */
const SISI = 1568;

/**
 * Gambar beberapa halaman PDF (nomor 1, 2, …) menjadi JPEG (data URL). Halaman yang tidak ada dilewati.
 * Hasil: peta nomor halaman → data URL.
 */
export async function gambarHalamanPdf(data: Uint8Array, halaman: number[]): Promise<Map<number, string>> {
  const pdfjs = await muatPdfJs();
  const tugas = pdfjs.getDocument({ data: data.slice() });
  const dok = await tugas.promise;
  const hasil = new Map<number, string>();
  try {
    for (const no of [...new Set(halaman)].sort((a, b) => a - b)) {
      if (no < 1 || no > dok.numPages) continue;
      const hlm = await dok.getPage(no);
      const dasar = hlm.getViewport({ scale: 1 });
      const viewport = hlm.getViewport({ scale: SISI / Math.max(dasar.width, dasar.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await hlm.render({ canvas, viewport, background: "#ffffff" }).promise;
      hasil.set(no, canvas.toDataURL("image/jpeg", 0.85));
      hlm.cleanup();
    }
  } finally {
    await tugas.destroy();
  }
  return hasil;
}
