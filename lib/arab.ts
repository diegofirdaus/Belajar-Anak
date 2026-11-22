// Deteksi huruf Arab untuk tampilan teks campuran (Indonesia/Inggris + Arab). Dipakai server dan browser.

/** Satu huruf Arab, termasuk harakat dan bentuk presentasi. */
const HURUF = "\\u0600-\\u06FF\\u0750-\\u077F\\u0870-\\u089F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
/**
 * Satu potongan Arab: kata-kata Arab beserta spasi, tanda baca, angka, dan tanda kurung ayat ﴿ ﴾ di antaranya,
 * supaya satu kalimat Arab tidak terpecah dan arahnya tetap kanan-ke-kiri.
 */
const POTONGAN = new RegExp(`[${HURUF}](?:[${HURUF}\\s\\u200c\\u200d\\u00a0\\d.,:;!?()\\[\\]«»\\u060C\\u061B\\u061F\\u06D4\\uFD3E\\uFD3F-]*[${HURUF}\\uFD3E\\uFD3F])?`, "g");

export const adaArab = (s: string) => new RegExp(`[${HURUF}]`).test(s);

/** Pecah teks menjadi potongan biasa dan potongan Arab, urut seperti aslinya. */
export function pecahArab(s: string): { teks: string; arab: boolean }[] {
  const hasil: { teks: string; arab: boolean }[] = [];
  let akhir = 0;
  for (const m of s.matchAll(POTONGAN)) {
    if (m.index! > akhir) hasil.push({ teks: s.slice(akhir, m.index), arab: false });
    hasil.push({ teks: m[0], arab: true });
    akhir = m.index! + m[0].length;
  }
  if (akhir < s.length) hasil.push({ teks: s.slice(akhir), arab: false });
  return hasil;
}
