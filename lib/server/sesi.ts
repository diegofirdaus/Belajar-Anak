import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { Soal, SoalTanpaKunci } from "@/lib/soal";

export type SumberSoal = "ai" | "set" | "set_similar" | "demo";

/**
 * Paket soal disimpan di server lengkap dengan kunci dan penjelasan.
 * Browser hanya menerima soal dan pilihan; jawaban dicek lewat server (keputusan: kunci di server).
 */
export async function simpanSesi(
  familyId: string,
  pemainId: string,
  s: { sumber: SumberSoal; mapel: string; topik: string; level: string; soal: Soal[]; setId?: string },
): Promise<{ sesiId: string; soal: SoalTanpaKunci[] }> {
  const ref = db().collection("families").doc(familyId).collection("players").doc(pemainId).collection("sesi").doc();
  await ref.set({
    ...s,
    setId: s.setId ?? null,
    n: s.soal.length,
    jawaban: [],
    selesai: false,
    dibuat: FieldValue.serverTimestamp(),
  });
  return { sesiId: ref.id, soal: s.soal.map(({ q, options }) => ({ q, options })) };
}
