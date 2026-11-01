import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { ApiError } from "./http";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const PERCOBAAN_MAKS = 5;
const JEDA_MS = 5 * 60_000;
const SESI_MS = 60 * 60_000;
/** Reset PIN hanya boleh kalau orang tua baru saja login ulang (detik). */
const LOGIN_BARU_DETIK = () => Number(process.env.ADMIN_LOGIN_ULANG_DETIK) || 5 * 60;

const keluarga = (familyId: string) => db().collection("families").doc(familyId);
const sesiAdmin = (familyId: string) => keluarga(familyId).collection("adminSesi");
const sidik = (token: string) => createHash("sha256").update(token).digest("hex");

/** Hash PIN dengan salt acak (scrypt). Disimpan sebagai "scrypt$salt$hash". */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt.toString("hex")}$${h.toString("hex")}`;
}

export async function cocokPin(pin: string, tersimpan: string): Promise<boolean> {
  const [jenis, saltHex, hashHex] = tersimpan.split("$");
  if (jenis !== "scrypt" || !saltHex || !hashHex) return false;
  const h = await scryptAsync(pin, Buffer.from(saltHex, "hex"), 32);
  const target = Buffer.from(hashHex, "hex");
  return h.length === target.length && timingSafeEqual(h, target);
}

type DataKeluarga = { adminPinHash?: string | null; pinGagal?: number; pinKunciSampai?: Timestamp | null };

const sisaMenit = (sampai: number) => Math.max(1, Math.ceil((sampai - Date.now()) / 60_000));
const pesanKunci = (sampai: number) => `PIN salah terlalu sering. Coba lagi dalam ${sisaMenit(sampai)} menit.`;

export async function statusAdmin(familyId: string): Promise<{ adaPin: boolean; terkunciSampai: string | null }> {
  const d = ((await keluarga(familyId).get()).data() ?? {}) as DataKeluarga;
  const sampai = d.pinKunciSampai?.toMillis() ?? 0;
  return { adaPin: Boolean(d.adminPinHash), terkunciSampai: sampai > Date.now() ? new Date(sampai).toISOString() : null };
}

async function bukaSesi(familyId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await sesiAdmin(familyId).doc(sidik(token)).set({ berakhir: Timestamp.fromMillis(Date.now() + SESI_MS) });
  return token;
}

/** Memeriksa sesi admin dari header `X-Admin-Sesi`. */
export async function requireAdmin(req: Request, familyId: string): Promise<void> {
  const token = req.headers.get("x-admin-sesi") ?? "";
  if (!token || token.length > 100) throw new ApiError("admin_perlu");
  const d = await sesiAdmin(familyId).doc(sidik(token)).get();
  const berakhir = (d.data()?.berakhir as Timestamp | undefined)?.toMillis() ?? 0;
  if (berakhir < Date.now()) throw new ApiError("admin_perlu");
}

/**
 * Membuat PIN pertama kali (tanpa sesi admin), atau mengganti PIN (wajib sesi admin).
 * Mengembalikan token sesi admin baru.
 */
export async function aturPin(req: Request, familyId: string, pin: string): Promise<string> {
  const ref = keluarga(familyId);
  const ada = Boolean(((await ref.get()).data() as DataKeluarga | undefined)?.adminPinHash);
  if (ada) await requireAdmin(req, familyId);
  const hash = await hashPin(pin);
  await db().runTransaction(async (tx) => {
    const d = ((await tx.get(ref)).data() ?? {}) as DataKeluarga;
    // Dua perangkat membuat PIN bersamaan: yang kedua harus punya sesi admin.
    if (!ada && d.adminPinHash) throw new ApiError("admin_perlu");
    tx.set(ref, { adminPinHash: hash, pinGagal: 0, pinKunciSampai: null }, { merge: true });
  });
  return bukaSesi(familyId);
}

/** Masuk mode admin. Setelah 5 PIN salah, jeda 5 menit (dihitung di server dalam transaksi). */
export async function masukAdmin(familyId: string, pin: string): Promise<string> {
  const ref = keluarga(familyId);
  const d0 = ((await ref.get()).data() ?? {}) as DataKeluarga;
  if (!d0.adminPinHash) throw new ApiError("tidak_ditemukan", "PIN admin belum dibuat.");
  const sampai0 = d0.pinKunciSampai?.toMillis() ?? 0;
  if (sampai0 > Date.now()) throw new ApiError("pin_terkunci", pesanKunci(sampai0));

  const benar = await cocokPin(pin, d0.adminPinHash);
  const hasil = await db().runTransaction(async (tx) => {
    const d = ((await tx.get(ref)).data() ?? {}) as DataKeluarga;
    const sampai = d.pinKunciSampai?.toMillis() ?? 0;
    if (sampai > Date.now()) return { kunci: sampai };
    if (d.adminPinHash !== d0.adminPinHash) return { salah: true }; // PIN diganti di perangkat lain
    if (benar) {
      tx.update(ref, { pinGagal: 0, pinKunciSampai: null });
      return { ok: true };
    }
    const gagal = (d.pinGagal ?? 0) + 1;
    if (gagal >= PERCOBAAN_MAKS) {
      const s = Date.now() + JEDA_MS;
      tx.update(ref, { pinGagal: 0, pinKunciSampai: Timestamp.fromMillis(s) });
      return { kunci: s };
    }
    tx.update(ref, { pinGagal: gagal });
    return { salah: true, sisa: PERCOBAAN_MAKS - gagal };
  });
  if ("kunci" in hasil && hasil.kunci) throw new ApiError("pin_terkunci", pesanKunci(hasil.kunci));
  if ("salah" in hasil) throw new ApiError("pin_salah");
  return bukaSesi(familyId);
}

/** Lupa PIN: hapus PIN kalau orang tua baru saja login ulang dengan Google. */
export async function resetPin(familyId: string, authTime: number): Promise<void> {
  if (Date.now() / 1000 - authTime > LOGIN_BARU_DETIK()) throw new ApiError("login_ulang");
  await keluarga(familyId).set({ adminPinHash: null, pinGagal: 0, pinKunciSampai: null }, { merge: true });
  const semua = await sesiAdmin(familyId).get();
  await Promise.all(semua.docs.map((d) => d.ref.delete()));
}

export async function keluarAdmin(req: Request, familyId: string): Promise<void> {
  const token = req.headers.get("x-admin-sesi") ?? "";
  if (token && token.length <= 100) await sesiAdmin(familyId).doc(sidik(token)).delete();
}
