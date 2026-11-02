import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { ApiError } from "./http";

const angka = (v: string | undefined, bawaan: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : bawaan;
};
export const BATAS_PER_PEMAIN = () => angka(process.env.AI_LIMIT_PER_PLAYER, 20);
export const BATAS_PER_KELUARGA = () => angka(process.env.AI_LIMIT_PER_FAMILY, 60);
export const BATAS_RAPIKAN = () => angka(process.env.AI_LIMIT_RAPIKAN, 30);
/** Pemeriksaan jawaban esai per anak per hari (terpisah dari jatah membuat soal). */
export const BATAS_ESAI = () => angka(process.env.AI_LIMIT_ESAI, 100);

/** Tanggal hari ini di Indonesia (WIB), dipakai sebagai kunci jatah harian. */
export function hariIni(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

const dokHari = (familyId: string, tanggal = hariIni()) =>
  db().collection("families").doc(familyId).collection("pemakaian").doc(tanggal);

/**
 * Ambil satu jatah paket soal AI. Cek dan tambah dalam satu transaksi,
 * jadi ketukan beruntun tidak bisa melewati batas.
 */
export async function ambilJatah(familyId: string, pemainId: string): Promise<{ tanggal: string }> {
  const tanggal = hariIni();
  const ref = dokHari(familyId, tanggal);
  await db().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {};
    const total = (d.total as number | undefined) ?? 0;
    const milikPemain = ((d.perPemain as Record<string, number> | undefined) ?? {})[pemainId] ?? 0;
    if (milikPemain >= BATAS_PER_PEMAIN() || total >= BATAS_PER_KELUARGA()) throw new ApiError("jatah_habis");
    tx.set(ref, { total: FieldValue.increment(1), perPemain: { [pemainId]: FieldValue.increment(1) } }, { merge: true });
  });
  return { tanggal };
}

/** Jatah merapikan soal admin per keluarga per hari, terpisah dari jatah anak. */
export async function ambilJatahRapikan(familyId: string): Promise<{ tanggal: string }> {
  const tanggal = hariIni();
  const ref = dokHari(familyId, tanggal);
  await db().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {};
    if (((d.rapikan as number | undefined) ?? 0) >= BATAS_RAPIKAN()) throw new ApiError("jatah_habis", "Jatah merapikan soal hari ini sudah habis. Besok bisa lagi.");
    tx.set(ref, { rapikan: FieldValue.increment(1) }, { merge: true });
  });
  return { tanggal };
}

export async function kembalikanJatahRapikan(familyId: string, tanggal: string): Promise<void> {
  await dokHari(familyId, tanggal).set({ rapikan: FieldValue.increment(-1) }, { merge: true });
}

/** Jatah memeriksa esai per anak per hari (`esai.{pemainId}`), dalam transaksi. */
export async function ambilJatahEsai(familyId: string, pemainId: string): Promise<{ tanggal: string }> {
  const tanggal = hariIni();
  const ref = dokHari(familyId, tanggal);
  await db().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() ?? {};
    if ((((d.esai as Record<string, number> | undefined) ?? {})[pemainId] ?? 0) >= BATAS_ESAI())
      throw new ApiError("jatah_habis", "Jatah memeriksa jawaban esai hari ini sudah habis. Besok bisa lagi, ya!");
    tx.set(ref, { esai: { [pemainId]: FieldValue.increment(1) } }, { merge: true });
  });
  return { tanggal };
}

export async function kembalikanJatahEsai(familyId: string, pemainId: string, tanggal: string): Promise<void> {
  await dokHari(familyId, tanggal).set({ esai: { [pemainId]: FieldValue.increment(-1) } }, { merge: true });
}

/** Kembalikan jatah kalau soal gagal dibuat. */
export async function kembalikanJatah(familyId: string, pemainId: string, tanggal: string): Promise<void> {
  await dokHari(familyId, tanggal).set(
    { total: FieldValue.increment(-1), perPemain: { [pemainId]: FieldValue.increment(-1) } },
    { merge: true },
  );
}

/** Catat pemakaian token per permintaan AI untuk memantau biaya (brief 5). */
export async function catatAi(
  familyId: string,
  log: {
    jenis: "soal_baru" | "soal_mirip" | "rapikan" | "baca_foto" | "periksa_esai";
    pemainId?: string;
    model: string;
    hasil: string;
    pemakaian: { masuk: number; keluar: number; cacheBaca: number };
  },
): Promise<void> {
  await db()
    .collection("families")
    .doc(familyId)
    .collection("logAi")
    .add({ ...log, pemainId: log.pemainId ?? null, waktu: FieldValue.serverTimestamp() });
}
