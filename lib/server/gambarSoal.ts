import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { GAMBAR_PER_KELUARGA_MAKS } from "@/lib/gambarSoal";
import { ApiError } from "./http";

/**
 * Potongan gambar soal: `families/{uid}/gambarSoal/{id}` = { data (base64 JPEG), setId, dibuat }.
 * Hanya bisa dibaca lewat server dengan login keluarga itu (aturan Firestore menolak semua akses browser).
 * Foto halaman utuh tidak pernah disimpan; yang diunggah hanya potongan yang dipilih orang tua.
 */
const koleksi = (familyId: string) => db().collection("families").doc(familyId).collection("gambarSoal");

/** Gambar yang belum dipakai paket mana pun dihapus setelah sehari (mis. editor ditutup tanpa simpan). */
const YATIM_MS = 24 * 60 * 60 * 1000;

export async function simpanGambar(familyId: string, data: string): Promise<string> {
  const col = koleksi(familyId);
  if ((await col.count().get()).data().count >= GAMBAR_PER_KELUARGA_MAKS)
    throw new ApiError("batas", `Maksimal ${GAMBAR_PER_KELUARGA_MAKS} gambar soal. Hapus paket lama yang tidak dipakai dulu.`);
  const ref = col.doc();
  await ref.set({ data, media_type: "image/jpeg", setId: null, dibuat: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function ambilGambar(familyId: string, id: string): Promise<{ data: string; media_type: string }> {
  const d = await koleksi(familyId).doc(id).get();
  if (!d.exists) throw new ApiError("tidak_ditemukan", "Gambar soal tidak ditemukan.");
  const x = d.data()!;
  return { data: x.data as string, media_type: (x.media_type as string) ?? "image/jpeg" };
}

/**
 * Dipanggil sebelum paket disimpan: semua gambar yang dipakai harus ada dan belum milik paket lain.
 * Gambar baru ditandai milik paket ini.
 */
export async function klaimGambar(familyId: string, setId: string, dipakai: string[]): Promise<void> {
  if (!dipakai.length) return;
  const refs = dipakai.map((id) => koleksi(familyId).doc(id));
  const snaps = await db().getAll(...refs);
  for (const s of snaps) {
    if (!s.exists) throw new ApiError("tidak_valid", "Ada gambar soal yang tidak ditemukan. Potong gambarnya lagi, lalu simpan.");
    const milik = s.data()!.setId as string | null;
    if (milik && milik !== setId) throw new ApiError("tidak_valid", "Ada gambar soal milik paket lain.");
  }
  const batch = db().batch();
  for (const s of snaps) if (!s.data()!.setId) batch.update(s.ref, { setId });
  await batch.commit();
}

/**
 * Setelah paket disimpan/dihapus: hapus gambar paket itu yang tidak dipakai lagi,
 * dan gambar yatim (tanpa paket) yang lebih tua dari sehari.
 */
export async function bersihkanGambar(familyId: string, setId: string, dipakai: string[]): Promise<void> {
  const tetap = new Set(dipakai);
  const [milik, yatim] = await Promise.all([
    koleksi(familyId).where("setId", "==", setId).select().get(),
    koleksi(familyId).where("setId", "==", null).select("dibuat").get(),
  ]);
  const batas = Date.now() - YATIM_MS;
  const hapus = [
    ...milik.docs.filter((d) => !tetap.has(d.id)),
    ...yatim.docs.filter((d) => {
      const t = d.get("dibuat");
      return t instanceof Timestamp && t.toMillis() < batas;
    }),
  ];
  for (let i = 0; i < hapus.length; i += 400) {
    const batch = db().batch();
    hapus.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}
