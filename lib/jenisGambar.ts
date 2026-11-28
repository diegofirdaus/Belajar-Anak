// Jenis gambar dibaca dari isinya (base64), bukan dari label. Browser di HP kadang menghasilkan PNG
// walau diminta JPEG; label yang salah ditolak Claude ("image/jpeg … appears to be image/png").

export type JenisGambar = "image/jpeg" | "image/png" | "image/webp";

/** Jenis gambar dari awal data base64, atau null kalau bukan JPEG/PNG/WEBP. */
export function jenisGambar(base64: string): JenisGambar | null {
  let awal: string;
  try {
    awal = atob(base64.slice(0, 16)); // 12 byte pertama
  } catch {
    return null;
  }
  if (awal.startsWith("\xFF\xD8\xFF")) return "image/jpeg";
  if (awal.startsWith("\x89PNG\r\n\x1A\n")) return "image/png";
  if (awal.startsWith("RIFF") && awal.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}
