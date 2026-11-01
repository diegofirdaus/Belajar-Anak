import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, db } from "@/lib/firebase/admin";
import { ApiError } from "./http";

/**
 * Memeriksa token login orang tua dari header Authorization.
 * UID akun orang tua dipakai sebagai id keluarga.
 */
export async function requireFamily(req: Request): Promise<{ familyId: string; authTime: number }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError("sesi_habis");
  // Di luar try: kunci server yang belum siap harus terlihat sebagai masalah server, bukan sesi habis.
  const auth = adminAuth();
  let uid: string;
  let authTime: number;
  try {
    const d = await auth.verifyIdToken(token);
    uid = d.uid;
    authTime = d.auth_time;
  } catch {
    throw new ApiError("sesi_habis");
  }
  const ref = db().collection("families").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) await ref.set({ createdAt: FieldValue.serverTimestamp(), adminPinHash: null });
  // auth_time = kapan orang tua terakhir benar-benar login (detik), dipakai untuk reset PIN admin.
  return { familyId: uid, authTime };
}
