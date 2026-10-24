import "server-only";

import { NextResponse } from "next/server";

/** Kode error yang dipetakan ke pesan ramah anak di browser. */
export type ApiErrorCode = "sesi_habis" | "tidak_ditemukan" | "tidak_valid" | "batas" | "gangguan";

const STATUS: Record<ApiErrorCode, number> = {
  sesi_habis: 401,
  tidak_ditemukan: 404,
  tidak_valid: 400,
  batas: 429,
  gangguan: 500,
};

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message?: string) {
    super(message ?? code);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function handle(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    if (e instanceof ApiError) return json({ error: e.code, message: e.message }, { status: STATUS[e.code] });
    console.error(e);
    return json({ error: "gangguan" }, { status: 500 });
  });
}
