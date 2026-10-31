import "server-only";

import { NextResponse } from "next/server";
import { ServerConfigError } from "@/lib/firebase/admin";

/** Kode error yang dipetakan ke pesan ramah anak di browser. */
export type ApiErrorCode =
  | "sesi_habis"
  | "tidak_ditemukan"
  | "tidak_valid"
  | "batas"
  | "server_belum_siap"
  | "gangguan"
  // Pembuatan soal oleh AI (brief 10.5)
  | "jatah_habis"
  | "terlalu_cepat"
  | "ditolak"
  | "json_rusak"
  | "kurang_lengkap"
  | "ai_belum_siap";

const STATUS: Record<ApiErrorCode, number> = {
  sesi_habis: 401,
  tidak_ditemukan: 404,
  tidak_valid: 400,
  batas: 429,
  server_belum_siap: 503,
  jatah_habis: 429,
  terlalu_cepat: 429,
  ditolak: 422,
  json_rusak: 502,
  kurang_lengkap: 502,
  ai_belum_siap: 503,
  gangguan: 500,
};

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message?: string,
    /** Untuk kegagalan AI yang tetap memakai token: dicatat di log biaya. */
    public ai?: { model: string; pemakaian: { masuk: number; keluar: number; cacheBaca: number } },
  ) {
    super(message ?? code);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    if (e instanceof ApiError) return json({ error: e.code, message: e.message }, { status: STATUS[e.code] });
    if (e instanceof ServerConfigError) {
      console.error("Firebase Admin belum siap:", e.reason);
      return json({ error: "server_belum_siap" }, { status: 503 });
    }
    console.error(e);
    return json({ error: "gangguan" }, { status: 500 });
  });
}
