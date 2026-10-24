import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Masalah = "impor" | "kunci_kosong" | "kunci_rusak" | "firestore" | "lambat";

function balas(ok: boolean, data: { masalah?: Masalah; pesan: string; detail?: string }) {
  return NextResponse.json({ ok, ...data }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

/** Pesan error teknis yang aman ditampilkan: dipotong, dan tanpa isi kunci. */
function ringkas(e: unknown): string {
  const m = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return m.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[kunci disembunyikan]").slice(0, 300);
}

/**
 * Pemeriksaan untuk orang tua/pengembang: apakah server sudah tersambung ke Firebase.
 * Tidak memerlukan login dan tidak pernah menampilkan isi kunci. Library Firebase dimuat
 * di dalam pemeriksaan supaya kegagalan memuat pun terlihat, bukan 500 kosong.
 */
export async function GET() {
  let admin: typeof import("@/lib/firebase/admin");
  try {
    admin = await import("@/lib/firebase/admin");
  } catch (e) {
    console.error("Gagal memuat Firebase Admin:", e);
    return balas(false, { masalah: "impor", pesan: "Library Firebase di server gagal dimuat.", detail: ringkas(e) });
  }

  try {
    const lambat = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("lambat")), 10_000));
    await Promise.race([admin.db().collection("families").limit(1).get(), lambat]);
    return balas(true, { pesan: "Server tersambung ke Firebase." });
  } catch (e) {
    console.error("Pemeriksaan Firestore gagal:", e);
    if (e instanceof admin.ServerConfigError) {
      const pesan =
        e.reason === "kunci_kosong"
          ? "FIREBASE_SERVICE_ACCOUNT belum ada di environment deploy ini. Cek centang Preview/Production, lalu Redeploy."
          : "FIREBASE_SERVICE_ACCOUNT ada, tapi isinya bukan JSON service account yang lengkap. Tempel ulang seluruh isi file .json.";
      return balas(false, { masalah: e.reason, pesan });
    }
    if (e instanceof Error && e.message === "lambat")
      return balas(false, {
        masalah: "lambat",
        pesan: "Firestore tidak menjawab dalam 10 detik. Cek apakah database Firestore sudah dibuat.",
      });
    return balas(false, {
      masalah: "firestore",
      pesan: "Kunci terbaca, tapi Firestore menolak atau belum dibuat. Cek database Firestore di Firebase.",
      detail: ringkas(e),
    });
  }
}
