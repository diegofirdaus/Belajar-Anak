"use client";

import { clientAuth } from "@/lib/firebase/client";
import type { NewPlayer, Player, PlayerUpdate } from "@/lib/player";
import type { Riwayat, StatTopik } from "@/lib/latihan";
import type { HasilJawab, PaketSesi, PermintaanJawab, PermintaanSoal } from "@/lib/soal";
import type { PaketBaru, PaketPilihan, PaketRingkas, SoalPilihan } from "@/lib/soalPilihan";

export class ApiFailure extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Pesan untuk anak/orang tua per kode error dari server (brief 10.5). `konteks: "soal"` untuk form membuat soal. */
export function apiMessage(e: unknown, konteks?: "soal"): string {
  const code = e instanceof ApiFailure ? e.code : "jaringan";
  if (code === "sesi_habis") return "Sesi login sudah habis. Minta orang tua masuk lagi, lalu coba lagi.";
  if (code === "server_belum_siap") return "Server belum tersambung ke database. Minta orang tua mengecek pengaturan, lalu coba lagi.";
  // Pembuatan soal oleh AI (brief 10.5)
  if (code === "jatah_habis")
    return e instanceof ApiFailure && e.message !== code ? e.message : "Jatah membuat soal hari ini sudah habis. Besok bisa lagi, ya!";
  if (code === "terlalu_cepat") return "Terlalu banyak permintaan barusan. Tunggu sebentar, lalu coba lagi.";
  if (code === "ditolak")
    return 'Materi itu tidak bisa dibuatkan soal. Coba tulis materi pelajaran sekolah, misalnya "pecahan" atau "sistem pernapasan".';
  if (code === "json_rusak") return "Soalnya belum tersusun rapi. Tekan tombol buat soal sekali lagi.";
  if (code === "kurang_lengkap") return "Soalnya belum lengkap. Tekan tombol buat soal sekali lagi.";
  if (code === "tidak_ditemukan" && konteks === "soal" && e instanceof ApiFailure && e.message !== code) return e.message;
  if (code === "ai_belum_siap") return "Pembuat soal belum siap. Minta orang tua mengecek kunci Claude API, atau coba soal contoh.";
  // Mode admin (brief 7.8)
  if (code === "pin_salah") return "PIN salah. Coba lagi.";
  if (code === "pin_terkunci" && e instanceof ApiFailure && e.message !== code) return e.message;
  if (code === "admin_perlu") return "Sesi mode admin sudah habis. Masukkan PIN lagi.";
  if (code === "login_ulang") return "Masuk ulang dengan Google dulu, lalu coba lagi.";
  if (code === "batas" && e instanceof ApiFailure && e.message !== code) return e.message;
  if (code === "tidak_valid" && e instanceof ApiFailure && e.message !== code) return e.message;
  return konteks === "soal" ? "Koneksi terputus saat membuat soal. Coba lagi." : "Koneksi terputus. Coba lagi.";
}

/** Permintaan yang dibatalkan anak (tombol Batal di layar memuat). */
export const dibatalkan = (e: unknown) => e instanceof ApiFailure && e.code === "batal";

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
  } catch (e) {
    if (init?.signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) throw new ApiFailure("batal");
    throw new ApiFailure("jaringan");
  }
  const body = await res.json().catch(() => ({}));
  if (init?.signal?.aborted) throw new ApiFailure("batal");
  if (!res.ok) throw new ApiFailure(body.error ?? "gangguan", body.message);
  return body as T;
}

const adminHeader = (sesi?: string): Record<string, string> => (sesi ? { "X-Admin-Sesi": sesi } : {});

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
    call<PaketSesi>("/api/soal", { method: "POST", body: JSON.stringify(p), signal }),
  soalContoh: (pemainId: string, signal?: AbortSignal) =>
    call<PaketSesi>("/api/soal/contoh", { method: "POST", body: JSON.stringify({ pemainId }), signal }),
  kerjakanPilihan: (pemainId: string, setId: string, signal?: AbortSignal) =>
    call<PaketSesi>("/api/soal/pilihan", { method: "POST", body: JSON.stringify({ pemainId, setId }), signal }),
  soalMirip: (pemainId: string, setId: string, signal?: AbortSignal) =>
    call<PaketSesi>("/api/soal/mirip", { method: "POST", body: JSON.stringify({ pemainId, setId }), signal }),
  jawab: (sesiId: string, j: PermintaanJawab) =>
    call<HasilJawab>(`/api/sesi/${encodeURIComponent(sesiId)}/jawab`, { method: "POST", body: JSON.stringify(j) }),
  ringkasan: (pemainId: string) =>
    call<{ riwayat: Riwayat[]; topik: StatTopik[]; paketPilihan: PaketRingkas[]; aiTersedia: boolean }>(
      `/api/pemain/${encodeURIComponent(pemainId)}/ringkasan`,
    ),
  /* ---------- Mode admin ---------- */
  statusAdmin: () => call<{ adaPin: boolean; terkunciSampai: string | null; aiTersedia: boolean }>("/api/admin"),
  aturPin: (pin: string, sesi?: string) =>
    call<{ token: string }>("/api/admin/pin", { method: "POST", body: JSON.stringify({ pin }), headers: adminHeader(sesi) }).then((r) => r.token),
  masukAdmin: (pin: string) =>
    call<{ token: string }>("/api/admin/masuk", { method: "POST", body: JSON.stringify({ pin }) }).then((r) => r.token),
  resetPin: () => call<{ ok: true }>("/api/admin/reset", { method: "POST" }),
  keluarAdmin: (sesi: string) => call<{ ok: true }>("/api/admin/keluar", { method: "POST", headers: adminHeader(sesi) }),
  daftarPaket: (sesi: string) =>
    call<{ paket: PaketPilihan[] }>("/api/admin/soal-pilihan", { headers: adminHeader(sesi) }).then((r) => r.paket),
  simpanPaket: (sesi: string, p: PaketBaru, id?: string) =>
    call<{ paket: PaketPilihan }>(id ? `/api/admin/soal-pilihan/${encodeURIComponent(id)}` : "/api/admin/soal-pilihan", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(p),
      headers: adminHeader(sesi),
    }).then((r) => r.paket),
  hapusPaket: (sesi: string, id: string) =>
    call<{ ok: true }>(`/api/admin/soal-pilihan/${encodeURIComponent(id)}`, { method: "DELETE", headers: adminHeader(sesi) }),
  rapikan: (sesi: string, b: { kelas: number; mapel: string; teks: string }) =>
    call<{ soal: SoalPilihan[] }>("/api/admin/rapikan", { method: "POST", body: JSON.stringify(b), headers: adminHeader(sesi) }).then(
      (r) => r.soal,
    ),
  deletePlayer: (id: string) => call<{ ok: true }>(`/api/pemain/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
