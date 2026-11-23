import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { ApiError } from "./http";

/**
 * Anggota keluarga: akun Google lain (mis. pasangan) yang memakai data keluarga yang sama.
 * - `undangan/{email}`: email yang diundang pemilik, belum pernah login.
 * - `anggota/{uid}`: akun yang sudah bergabung → keluarga mana yang dipakai.
 * Data keluarga tetap di `families/{uidPemilik}`.
 */
export const ANGGOTA_MAKS = 5;

const undangan = () => db().collection("undangan");
const anggota = () => db().collection("anggota");
const keluarga = (id: string) => db().collection("families").doc(id);

export const rapiEmail = (e: string) => e.trim().toLowerCase();

export type InfoAnggota = { email: string; status: "menunggu" | "bergabung" };

/**
 * Keluarga yang dipakai akun ini. Kalau ada undangan untuk email akun ini, akun langsung bergabung
 * dan data keluarganya sendiri (kalau ada) dihapus (keputusan pemilik). Akun yang sudah punya anggota
 * sendiri tidak ikut bergabung, supaya keluarganya tidak terhapus karena salah undang.
 */
export async function keluargaUntuk(uid: string, email: string | null): Promise<{ familyId: string; pemilik: boolean }> {
  const m = await anggota().doc(uid).get();
  if (m.exists) {
    const familyId = m.data()!.familyId as string;
    if ((await keluarga(familyId).get()).exists) return { familyId, pemilik: false };
    await m.ref.delete(); // keluarga pengundang sudah dihapus
  }
  if (email) {
    const u = await undangan().doc(email).get();
    const familyId = u.exists ? (u.data()!.familyId as string) : null;
    if (familyId && familyId !== uid && (await keluarga(familyId).get()).exists) {
      const punyaAnggota = !(await anggota().where("familyId", "==", uid).limit(1).get()).empty;
      if (!punyaAnggota) {
        await db().runTransaction(async (tx) => {
          const sudah = await tx.get(anggota().doc(uid));
          if (sudah.exists) return;
          tx.set(anggota().doc(uid), { familyId, email, sejak: FieldValue.serverTimestamp() });
          tx.delete(undangan().doc(email));
        });
        // Data keluarga lama akun ini dibuang, termasuk undangan yang pernah dibuatnya.
        await db().recursiveDelete(keluarga(uid));
        const lama = await undangan().where("familyId", "==", uid).get();
        await Promise.all(lama.docs.map((d) => d.ref.delete()));
        return { familyId, pemilik: false };
      }
    }
  }
  return { familyId: uid, pemilik: true };
}

export async function daftarAnggota(familyId: string): Promise<InfoAnggota[]> {
  const [a, u] = await Promise.all([anggota().where("familyId", "==", familyId).get(), undangan().where("familyId", "==", familyId).get()]);
  const waktu = (t: unknown) => (t instanceof Timestamp ? t.toMillis() : 0);
  return [
    ...a.docs.sort((x, y) => waktu(x.data().sejak) - waktu(y.data().sejak)).map((d) => ({ email: d.data().email as string, status: "bergabung" as const })),
    ...u.docs.sort((x, y) => waktu(x.data().dibuat) - waktu(y.data().dibuat)).map((d) => ({ email: d.id, status: "menunggu" as const })),
  ];
}

export async function undangAnggota(familyId: string, emailPemilik: string | null, emailMasuk: string): Promise<void> {
  const email = rapiEmail(emailMasuk);
  if (emailPemilik && email === rapiEmail(emailPemilik)) throw new ApiError("tidak_valid", "Itu email akun Anda sendiri.");
  const sekarang = await daftarAnggota(familyId);
  if (sekarang.some((x) => x.email === email)) throw new ApiError("tidak_valid", "Email itu sudah ada di daftar anggota.");
  if (sekarang.length >= ANGGOTA_MAKS) throw new ApiError("batas", `Maksimal ${ANGGOTA_MAKS} anggota keluarga.`);
  const ada = await undangan().doc(email).get();
  if (ada.exists && ada.data()!.familyId !== familyId) throw new ApiError("tidak_valid", "Email itu sudah diundang keluarga lain.");
  if (!(await anggota().where("email", "==", email).limit(1).get()).empty)
    throw new ApiError("tidak_valid", "Email itu sudah menjadi anggota keluarga lain.");
  await undangan().doc(email).set({ familyId, dibuat: FieldValue.serverTimestamp() });
}

/** Cabut undangan atau keanggotaan. Akun itu kembali ke keluarganya sendiri (kosong) saat login berikutnya. */
export async function cabutAnggota(familyId: string, emailMasuk: string): Promise<void> {
  const email = rapiEmail(emailMasuk);
  const u = await undangan().doc(email).get();
  if (u.exists && u.data()!.familyId === familyId) await u.ref.delete();
  const a = await anggota().where("familyId", "==", familyId).where("email", "==", email).get();
  await Promise.all(a.docs.map((d) => d.ref.delete()));
  if (!u.exists && a.empty) throw new ApiError("tidak_ditemukan", "Email itu tidak ada di daftar anggota.");
}

/** Saat keluarga dihapus: semua undangan dan keanggotaan ke keluarga itu ikut dihapus. */
export async function hapusSemuaAnggota(familyId: string): Promise<void> {
  const [a, u] = await Promise.all([anggota().where("familyId", "==", familyId).get(), undangan().where("familyId", "==", familyId).get()]);
  await Promise.all([...a.docs, ...u.docs].map((d) => d.ref.delete()));
}
