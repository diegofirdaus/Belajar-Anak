import "server-only";

import { GeoPoint, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { adminAuth, db } from "@/lib/firebase/admin";

/** Data rahasia yang tidak ikut diekspor: hash PIN dan token sesi admin. */
const KOLEKSI_DILEWATI = new Set(["adminSesi"]);
const FIELD_DILEWATI = new Set(["adminPinHash"]);

function rapikan(v: unknown): unknown {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof GeoPoint) return { lat: v.latitude, lng: v.longitude };
  if (Array.isArray(v)) return v.map(rapikan);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rapikan(x)]));
  return v;
}

type DokEkspor = { id: string; data: Record<string, unknown>; koleksi?: Record<string, DokEkspor[]> };

async function salinDok(ref: DocumentReference): Promise<DokEkspor> {
  const snap = await ref.get();
  const data = Object.fromEntries(Object.entries(snap.data() ?? {}).filter(([k]) => !FIELD_DILEWATI.has(k)));
  const hasil: DokEkspor = { id: ref.id, data: rapikan(data) as Record<string, unknown> };
  const koleksi: Record<string, DokEkspor[]> = {};
  for (const col of await ref.listCollections()) {
    if (KOLEKSI_DILEWATI.has(col.id)) continue;
    const docs = await col.listDocuments();
    koleksi[col.id] = await Promise.all(docs.map(salinDok));
  }
  if (Object.keys(koleksi).length) hasil.koleksi = koleksi;
  return hasil;
}

/** Salinan semua data keluarga (UU PDP, brief 11): pemain, hadiah, riwayat, soal pilihan, pemakaian AI. */
export async function eksporKeluarga(familyId: string, email: string | null) {
  return {
    aplikasi: "Markas Latihan",
    diekspor: new Date().toISOString(),
    akun: { email },
    keluarga: await salinDok(db().collection("families").doc(familyId)),
  };
}

/** Menghapus semua data keluarga beserta akun loginnya di Markas Latihan. Akun Google tidak tersentuh. */
export async function hapusKeluarga(familyId: string): Promise<void> {
  await db().recursiveDelete(db().collection("families").doc(familyId));
  await adminAuth()
    .deleteUser(familyId)
    .catch((e: { code?: string }) => {
      if (e.code !== "auth/user-not-found") throw e;
    });
}
