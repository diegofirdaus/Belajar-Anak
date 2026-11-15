"use client";

// Membaca teks dari file Word (.docx) di browser, tanpa pustaka tambahan.
// .docx = arsip ZIP berisi XML; isi dokumen ada di word/document.xml, penomoran otomatis di word/numbering.xml.
// File tidak dikirim ke server: hanya teksnya yang dimasukkan ke kolom Soal lalu dirapikan.

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
/** Batas ukuran isi yang dibuka (setelah dekompresi), supaya file aneh tidak menghabiskan memori HP. */
const ISI_MAKS = 30 * 1024 * 1024;

type Entri = { nama: string; metode: number; ukuranTerkompres: number; offsetLokal: number };

/** Daftar isi ZIP dari "central directory" di akhir file. */
function daftarZip(buf: ArrayBuffer): Entri[] {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65_535); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("File Word tidak bisa dibuka. Pastikan formatnya .docx.");
  const jumlah = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dek = new TextDecoder();
  const hasil: Entri[] = [];
  for (let k = 0; k < jumlah; k++) {
    if (p + 46 > buf.byteLength || v.getUint32(p, true) !== 0x02014b50) break;
    const panjangNama = v.getUint16(p + 28, true);
    const panjangEkstra = v.getUint16(p + 30, true);
    const panjangKomentar = v.getUint16(p + 32, true);
    hasil.push({
      metode: v.getUint16(p + 10, true),
      ukuranTerkompres: v.getUint32(p + 20, true),
      offsetLokal: v.getUint32(p + 42, true),
      nama: dek.decode(new Uint8Array(buf, p + 46, panjangNama)),
    });
    p += 46 + panjangNama + panjangEkstra + panjangKomentar;
  }
  return hasil;
}

async function bukaEntri(buf: ArrayBuffer, e: Entri): Promise<string> {
  const v = new DataView(buf);
  const o = e.offsetLokal;
  if (v.getUint32(o, true) !== 0x04034b50) throw new Error("File Word rusak.");
  const mulai = o + 30 + v.getUint16(o + 26, true) + v.getUint16(o + 28, true);
  const data = new Uint8Array(buf, mulai, e.ukuranTerkompres);
  if (e.metode === 0) return new TextDecoder().decode(data);
  if (e.metode !== 8) throw new Error("File Word memakai kompresi yang tidak dikenal.");
  const aliran = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const keping: Uint8Array[] = [];
  let total = 0;
  const r = aliran.getReader();
  for (;;) {
    const { done, value } = await r.read();
    if (done) break;
    total += value.length;
    if (total > ISI_MAKS) throw new Error("File Word terlalu besar.");
    keping.push(value);
  }
  const satu = new Uint8Array(total);
  let i = 0;
  for (const k of keping) {
    satu.set(k, i);
    i += k.length;
  }
  return new TextDecoder().decode(satu);
}

const romawi = (n: number) => {
  const t: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, h] of t) while (n >= v) ((s += h), (n -= v));
  return s;
};
const huruf = (n: number) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Format satu angka penomoran Word (decimal, upperLetter, lowerLetter, upperRoman, lowerRoman, bullet). */
export function formatNomor(fmt: string, n: number): string {
  if (fmt === "upperLetter") return huruf(n);
  if (fmt === "lowerLetter") return huruf(n).toLowerCase();
  if (fmt === "upperRoman") return romawi(n);
  if (fmt === "lowerRoman") return romawi(n).toLowerCase();
  if (fmt === "bullet" || fmt === "none") return "";
  return String(n);
}

type Level = { fmt: string; teks: string; mulai: number };

/** numId → level (0–8) → format, dari word/numbering.xml. */
function bacaPenomoran(xml: string | null): Map<string, Level[]> {
  const peta = new Map<string, Level[]>();
  if (!xml) return peta;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const abstrak = new Map<string, Level[]>();
  for (const a of Array.from(doc.getElementsByTagNameNS(W, "abstractNum"))) {
    const lv: Level[] = [];
    for (const l of Array.from(a.getElementsByTagNameNS(W, "lvl"))) {
      const ilvl = Number(l.getAttributeNS(W, "ilvl") ?? 0);
      const ambil = (tag: string) => l.getElementsByTagNameNS(W, tag)[0]?.getAttributeNS(W, "val") ?? "";
      lv[ilvl] = { fmt: ambil("numFmt") || "decimal", teks: ambil("lvlText") || `%${ilvl + 1}.`, mulai: Number(ambil("start") || 1) };
    }
    abstrak.set(a.getAttributeNS(W, "abstractNumId") ?? "", lv);
  }
  for (const n of Array.from(doc.getElementsByTagNameNS(W, "num"))) {
    const ref = n.getElementsByTagNameNS(W, "abstractNumId")[0]?.getAttributeNS(W, "val") ?? "";
    peta.set(n.getAttributeNS(W, "numId") ?? "", abstrak.get(ref) ?? []);
  }
  return peta;
}

/**
 * Ubah XML dokumen Word jadi teks biasa: satu paragraf per baris, penomoran otomatis ditulis ulang
 * ("1.", "A.", "a)" …) supaya soal dan pilihan tetap bisa dikenali saat dirapikan.
 */
export function teksDariXml(docXml: string, numXml: string | null): string {
  const doc = new DOMParser().parseFromString(docXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Isi file Word tidak bisa dibaca.");
  const nomor = bacaPenomoran(numXml);
  const hitung = new Map<string, number[]>();
  const baris: string[] = [];
  for (const p of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
    // Kotak teks punya salinan cadangan (mc:Fallback): lewati supaya tidak dobel.
    let anc: Element | null = p.parentElement;
    let cadangan = false;
    for (; anc; anc = anc.parentElement) if (anc.namespaceURI === MC && anc.localName === "Fallback") cadangan = true;
    if (cadangan) continue;
    // Paragraf di dalam kotak teks yang ada di paragraf lain diambil sendiri; teks induknya tidak menyalin isinya.
    let teks = "";
    const jalan = (el: Element) => {
      for (const c of Array.from(el.children)) {
        if (c.namespaceURI === W && c.localName === "p") continue;
        if (c.namespaceURI === W && c.localName === "t") teks += c.textContent ?? "";
        else if (c.namespaceURI === W && c.localName === "tab") teks += "\t";
        else if (c.namespaceURI === W && (c.localName === "br" || c.localName === "cr")) teks += "\n";
        else jalan(c);
      }
    };
    jalan(p);
    const numPr = p.getElementsByTagNameNS(W, "numPr")[0];
    const numId = numPr?.getElementsByTagNameNS(W, "numId")[0]?.getAttributeNS(W, "val");
    if (numPr && numId && numId !== "0") {
      const ilvl = Number(numPr.getElementsByTagNameNS(W, "ilvl")[0]?.getAttributeNS(W, "val") ?? 0);
      const lv = nomor.get(numId) ?? [];
      const c = hitung.get(numId) ?? [];
      c[ilvl] = (c[ilvl] ?? (lv[ilvl]?.mulai ?? 1) - 1) + 1;
      c.length = ilvl + 1; // level di bawahnya mulai lagi
      hitung.set(numId, c);
      const fmt = lv[ilvl] ?? { fmt: ilvl === 1 ? "upperLetter" : "decimal", teks: `%${ilvl + 1}.`, mulai: 1 };
      const awalan = fmt.teks.replace(/%(\d)/g, (_, d: string) => formatNomor(lv[Number(d) - 1]?.fmt ?? "decimal", c[Number(d) - 1] ?? 1));
      if (awalan.trim()) teks = `${awalan.trim()} ${teks}`;
    }
    baris.push(teks.trimEnd());
  }
  return baris
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Teks soal dari file .docx. */
export async function bacaDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const isi = daftarZip(buf);
  const cari = (nama: string) => isi.find((e) => e.nama === nama);
  const dok = cari("word/document.xml");
  if (!dok) throw new Error("File itu bukan dokumen Word (.docx).");
  const num = cari("word/numbering.xml");
  return teksDariXml(await bukaEntri(buf, dok), num ? await bukaEntri(buf, num) : null);
}

/** Isi file sebagai base64 (untuk PDF). */
export function keBase64(file: File): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => gagal(new Error("File tidak bisa dibuka."));
    r.readAsDataURL(file);
  });
}
