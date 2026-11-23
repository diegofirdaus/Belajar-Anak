import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, db } from "@/lib/firebase/admin";
import { keluargaUntuk, rapiEmail } from "./anggota";
import { ApiError } from "./http";

/**
 * Memeriksa token login orang tua dari header Authorization.
 * Id keluarga = UID akun pemilik. Anggota keluarga (akun lain yang diundang pemilik) memakai keluarga pemilik.
 */
export async function requireFamily(
  req: Request,
): Promise<{ familyId: string; authTime: number; uid: string; email: string | null; pemilik: boolean }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError("sesi_habis");
  // Di luar try: kunci server yang belum siap harus terlihat sebagai masalah server, bukan sesi habis.
  const auth = adminAuth();
  let uid: string;
  let authTime: number;
  let email: string | null;
  try {
    const d = await auth.verifyIdToken(token);
    uid = d.uid;
    authTime = d.auth_time;
    // Hanya email yang sudah diverifikasi (login Google) yang bisa menerima undangan anggota.
    email = d.email && d.email_verified ? rapiEmail(d.email) : null;
  } catch {
    throw new ApiError("sesi_habis");
  }
  const { familyId, pemilik } = await keluargaUntuk(uid, email);
  if (pemilik) {
    const ref = db().collection("families").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) await ref.set({ createdAt: FieldValue.serverTimestamp(), adminPinHash: null, emailPemilik: email });
    else if (email && snap.data()!.emailPemilik !== email) await ref.set({ emailPemilik: email }, { merge: true });
  }
  // auth_time = kapan orang tua terakhir benar-benar login (detik), dipakai untuk reset PIN admin.
  return { familyId, authTime, uid, email, pemilik };
}
