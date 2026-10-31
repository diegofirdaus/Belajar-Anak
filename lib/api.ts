"use client";

import { clientAuth } from "@/lib/firebase/client";
import type { NewPlayer, Player, PlayerUpdate } from "@/lib/player";
import type { PermintaanSoal, SoalTanpaKunci } from "@/lib/soal";

export class ApiFailure extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Pesan untuk anak/orang tua per kode error dari server (brief 10.5). */
export function apiMessage(e: unknown): string {
  const code = e instanceof ApiFailure ? e.code : "jaringan";
  if (code === "sesi_habis") return "Sesi login sudah habis. Minta orang tua masuk lagi, lalu coba lagi.";
  if (code === "server_belum_siap") return "Server belum tersambung ke database. Minta orang tua mengecek pengaturan, lalu coba lagi.";
  // Pembuatan soal oleh AI (brief 10.5)
  if (code === "jatah_habis") return "Jatah membuat soal hari ini sudah habis. Besok bisa lagi, ya!";
  if (code === "terlalu_cepat") return "Terlalu banyak permintaan barusan. Tunggu sebentar, lalu coba lagi.";
  if (code === "ditolak")
    return 'Materi itu tidak bisa dibuatkan soal. Coba tulis materi pelajaran sekolah, misalnya "pecahan" atau "sistem pernapasan".';
  if (code === "json_rusak") return "Soalnya belum tersusun rapi. Tekan tombol buat soal sekali lagi.";
  if (code === "kurang_lengkap") return "Soalnya belum lengkap. Tekan tombol buat soal sekali lagi.";
  if (code === "ai_belum_siap") return "Pembuat soal belum siap. Minta orang tua mengecek kunci Claude API, atau coba soal contoh.";
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
  updatePlayer: (id: string, u: PlayerUpdate) =>
    call<{ player: Player }>(`/api/pemain/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(u) }).then(
      (r) => r.player,
    ),
  buatSoal: (p: PermintaanSoal, signal?: AbortSignal) =>
    call<{ sesiId: string; soal: SoalTanpaKunci[] }>("/api/soal", { method: "POST", body: JSON.stringify(p), signal }),
  deletePlayer: (id: string) => call<{ ok: true }>(`/api/pemain/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
