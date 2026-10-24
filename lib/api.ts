"use client";

import { clientAuth } from "@/lib/firebase/client";
import type { NewPlayer, Player } from "@/lib/player";

export class ApiFailure extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Pesan untuk anak/orang tua per kode error dari server (brief 10.5). */
export function apiMessage(e: unknown): string {
  const code = e instanceof ApiFailure ? e.code : "jaringan";
  if (code === "sesi_habis") return "Sesi login sudah habis. Minta orang tua masuk lagi, lalu coba lagi.";
  if (code === "batas" && e instanceof ApiFailure && e.message !== code) return e.message;
  if (code === "tidak_valid" && e instanceof ApiFailure && e.message !== code) return e.message;
  return "Koneksi terputus. Coba lagi.";
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const user = clientAuth().currentUser;
  if (!user) throw new ApiFailure("sesi_habis");
  let res: Response;
  try {
    const token = await user.getIdToken();
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
  } catch {
    throw new ApiFailure("jaringan");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiFailure(body.error ?? "gangguan", body.message);
  return body as T;
}

export const api = {
  listPlayers: () => call<{ players: Player[] }>("/api/pemain").then((r) => r.players),
  getPlayer: (id: string) => call<{ player: Player }>(`/api/pemain/${encodeURIComponent(id)}`).then((r) => r.player),
  createPlayer: (p: NewPlayer) =>
    call<{ player: Player }>("/api/pemain", { method: "POST", body: JSON.stringify(p) }).then((r) => r.player),
};
