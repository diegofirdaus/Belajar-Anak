import "server-only";

import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { PAKET_MAKS, judulBawaan, type PaketBaru, type PaketPilihan, type PaketRingkas, type SoalPilihan } from "@/lib/soalPilihan";
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

/** Paket soal pilihan untuk satu kelas (sisi anak, brief 7.4): hanya judul, mapel, jumlah soal. */
export async function paketUntukKelas(familyId: string, kelas: number): Promise<PaketRingkas[]> {
  const snap = await koleksi(familyId).where("kelas", "==", kelas).get();
  return snap.docs
    .map(toPaket)
    .sort((a, b) => a.subject.localeCompare(b.subject, "id") || b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => ({ id: p.id, title: p.title, subject: p.subject, n: p.questions.length }));
}

/** Paket lengkap untuk dikerjakan pemain. Hanya paket untuk kelas pemain itu. */
export async function ambilPaketUntuk(familyId: string, id: string, kelas: number): Promise<PaketPilihan> {
  const d = await koleksi(familyId).doc(id).get();
  if (!d.exists) throw new ApiError("tidak_ditemukan", "Soal pilihan itu tidak ditemukan. Mungkin sudah dihapus orang tua.");
  const p = toPaket(d);
  if (p.kelas !== kelas) throw new ApiError("tidak_ditemukan", "Soal pilihan itu bukan untuk kelasmu.");
  if (!p.questions.length) throw new ApiError("kurang_lengkap");
  return p;
}
