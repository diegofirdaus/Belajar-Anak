import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, db } from "@/lib/firebase/admin";
import { ApiError } from "./http";

/**
 * Memeriksa token login orang tua dari header Authorization.
 * UID akun orang tua dipakai sebagai id keluarga.
 */
export async function requireFamily(req: Request): Promise<{ familyId: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new ApiError("sesi_habis");
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    throw new ApiError("sesi_habis");
  }
  const ref = db().collection("families").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) await ref.set({ createdAt: FieldValue.serverTimestamp(), adminPinHash: null });
  return { familyId: uid };
}
