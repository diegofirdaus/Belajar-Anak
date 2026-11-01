import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";

/** Kunci service account di server belum diisi atau tidak bisa dibaca. */
export class ServerConfigError extends Error {
  constructor(public reason: "kunci_kosong" | "kunci_rusak") {
    super(reason);
  }
}

function adminApp(): App {
  if (getApps().length) return getApp();
  // Emulator: tidak butuh kredensial.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: firebaseConfig.projectId });
  }
  // FIREBASE_SERVICE_ACOUNT: nama salah ketik yang sempat tersimpan di Vercel (Preview).
  // Hapus cadangan ini setelah variabelnya diganti nama.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACOUNT;
  if (!raw?.trim()) throw new ServerConfigError("kunci_kosong");
  let sa: { project_id?: string; client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new ServerConfigError("kunci_rusak");
  }
  if (!sa.project_id || !sa.client_email || !sa.private_key) throw new ServerConfigError("kunci_rusak");
  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      // Sebagian dashboard menyimpan "\n" sebagai teks; kembalikan jadi baris baru.
      privateKey: sa.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());

let firestore: Firestore | null = null;
export function db(): Firestore {
  if (firestore) return firestore;
  const app = adminApp();
  try {
    // REST, bukan gRPC: koneksi gRPC sering menggantung di fungsi serverless (Vercel).
    // Emulator tidak mendukung mode REST tanpa kredensial, jadi di sana pakai bawaan.
    firestore = initializeFirestore(app, { preferRest: !process.env.FIRESTORE_EMULATOR_HOST });
  } catch {
    firestore = getFirestore(app); // sudah diinisialisasi oleh modul lain (hot reload)
  }
  return firestore;
}
