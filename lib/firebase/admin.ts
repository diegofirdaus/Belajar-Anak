import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";

function adminApp(): App {
  if (getApps().length) return getApp();
  // Emulator: tidak butuh kredensial.
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: firebaseConfig.projectId });
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT belum diisi");
  const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
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
export const db = () => getFirestore(adminApp());
