import "server-only";

import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { PAKET_MAKS, judulBawaan, type PaketBaru, type PaketPilihan, type SoalPilihan } from "@/lib/soalPilihan";
import { ApiError } from "./http";

const koleksi = (familyId: string) => db().collection("families").doc(familyId).collection("soalPilihan");
const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : new Date().toISOString());

function toPaket(d: DocumentSnapshot): PaketPilihan {
  const x = d.data()!;
  return {
    id: d.id,
    title: x.title,
    kelas: x.kelas,
    subject: x.subject,
    sourceText: x.sourceText ?? "",
    questions: (x.questions ?? []) as SoalPilihan[],
    createdAt: iso(x.createdAt),
    updatedAt: iso(x.updatedAt),
  };
}

/** Urut kelas, lalu mapel, lalu yang terakhir diubah (brief 7.8). */
export async function daftarPaket(familyId: string): Promise<PaketPilihan[]> {
  const snap = await koleksi(familyId).get();
  return snap.docs
    .map(toPaket)
    .sort((a, b) => a.kelas - b.kelas || a.subject.localeCompare(b.subject, "id") || b.updatedAt.localeCompare(a.updatedAt));
}

const isi = (p: PaketBaru) => ({
  title: p.title || judulBawaan(p.subject, p.kelas),
  kelas: p.kelas,
  subject: p.subject,
  sourceText: p.sourceText,
  questions: p.questions,
  updatedAt: FieldValue.serverTimestamp(),
});

export async function buatPaket(familyId: string, p: PaketBaru): Promise<PaketPilihan> {
  const col = koleksi(familyId);
  if ((await col.count().get()).data().count >= PAKET_MAKS) throw new ApiError("batas", `Maksimal ${PAKET_MAKS} paket soal pilihan.`);
  const ref = col.doc();
  await ref.set({ ...isi(p), createdAt: FieldValue.serverTimestamp() });
  return toPaket(await ref.get());
}

export async function ubahPaket(familyId: string, id: string, p: PaketBaru): Promise<PaketPilihan> {
  const ref = koleksi(familyId).doc(id);
  if (!(await ref.get()).exists) throw new ApiError("tidak_ditemukan");
  await ref.update(isi(p));
  return toPaket(await ref.get());
}

export async function hapusPaket(familyId: string, id: string): Promise<void> {
  const ref = koleksi(familyId).doc(id);
  if (!(await ref.get()).exists) throw new ApiError("tidak_ditemukan");
  await ref.delete();
}
